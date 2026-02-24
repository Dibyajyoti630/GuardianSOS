const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SOS = require('../models/SOS');
const User = require('../models/User');
const Connection = require('../models/Connection');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const EmergencyContact = require('../models/EmergencyContact');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// @route   POST api/sos/trigger
// @desc    Trigger SOS, notify guardians
// @access  Private
router.post('/trigger', auth, async (req, res) => {
    try {
        const { location, alertLevel = 'SOS', battery = 'Unknown', network = 'Unknown' } = req.body; // { lat, lng, address }

        // 1. Create SOS Record
        const newSOS = new SOS({
            user: req.user.id,
            startLocation: location,
            locationHistory: [location ? { lat: location.lat, lng: location.lng } : {}]
        });

        await newSOS.save();

        // 2. Update User Status
        await User.findByIdAndUpdate(req.user.id, {
            status: alertLevel,
            lastKnownLocation: location
        });

        // 3. Notify Guardians & Emergency Contacts
        const connections = await Connection.find({
            user: req.user.id,
            status: 'active'
        }).populate('guardian', 'email name phone');

        const user = await User.findById(req.user.id);
        const googleMapsLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : 'Unknown Location';

        // Format Date to DD/MM/YYYY HH:mm:ss in IST
        const now = new Date();
        const formattedDate = now.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).toUpperCase(); // e.g., 25/02/2026, 12:13:00 AM

        let smsMessage = '';
        let emailSubject = '';
        if (alertLevel === 'Warning') {
            emailSubject = `WARNING ALERT: ${user.name} feels unsafe`;
        } else {
            emailSubject = `SOS ALERT: ${user.name} needs help!`;
        }

        // Initialize Twilio
        let client;
        try {
            client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        } catch (e) {
            console.error("Twilio Init Failed", e);
        }

        const emailPromises = connections.map(conn => {
            if (!conn.guardian) return null;

            // Generate personalized tracking link for this specific guardian
            // Pass the target user ID and the guardian's own email so frontend can verify
            const personalizedDashboardLink = process.env.FRONTEND_URL
                ? `${process.env.FRONTEND_URL}/guardiansos/guardian/dashboard?target=${req.user.id}&auth=${encodeURIComponent(conn.guardian.email)}`
                : `https://guardiansos-frontend.onrender.com/guardiansos/guardian/dashboard?target=${req.user.id}&auth=${encodeURIComponent(conn.guardian.email)}`;

            if (alertLevel === 'Warning') {
                smsMessage = `WARNING: ${user.name} feels unsafe and has triggered a Warning alert.
Time: ${formattedDate}
Track Live: ${personalizedDashboardLink}`;
            } else {
                smsMessage = `URGENT SOS: ${user.name} needs help!
Time: ${formattedDate}
Location: ${googleMapsLink}
Battery: ${battery}%
Network: ${network}
Track Live: ${personalizedDashboardLink}`;
            }

            let emailHtml = '';
            if (alertLevel === 'Warning') {
                emailHtml = `
                    <div style="background-color: #fef08a; padding: 20px; border: 2px solid #eab308; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ca8a04; margin-top: 0;">WARNING ALERT</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> feels unsafe and triggered a warning.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <div style="margin-top: 20px;">
                            <a href="${personalizedDashboardLink}" style="background-color: #eab308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            } else {
                emailHtml = `
                    <div style="background-color: #fee2e2; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ef4444; margin-top: 0;">SOS ALERT!</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> has triggered an emergency alert.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p><strong>Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
                        <p><strong>Battery:</strong> ${battery}%</p>
                        <p><strong>Network:</strong> ${network}</p>
                        <div style="margin-top: 20px;">
                            <a href="${personalizedDashboardLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            }

            // Send SMS to Guardian if they have a phone number
            if (conn.guardian.phone && client) {
                client.messages.create({
                    body: smsMessage,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    to: conn.guardian.phone
                }).catch(err => console.error('Twilio Error (Guardian):', err.message));
            }

            const msg = {
                to: conn.guardian.email,
                from: 'guardiansosfromguardian.com@gmail.com', // Replace with verified sender
                subject: emailSubject,
                text: `${smsMessage}\n\nPlease check the GuardianSOS app immediately.`,
                html: emailHtml
            };
            return sgMail.send(msg).catch(err => {
                console.error('Email Error (Guardian):', err.message);
                if (err.response) {
                    console.error('SendGrid API Error body:', err.response.body);
                }
            });
        });

        // 4. Notify Emergency Contacts (Non-App Users) via SMS (and Email if they have it)
        if (client || sgMail) {
            const contacts = await EmergencyContact.find({ userId: req.user.id });
            contacts.forEach(contact => {

                // For non-app emergency contacts, they don't have a dashboard login. 
                // Either don't send the dashboard link, or send a generic one. Let's send a generic one that tells them to use the app or call police.
                // However user requested a dashboard, maybe we should give them a specific read-only public link later. For now, we fallback to home or a generic dashboard prompt.
                const generalLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}` : `https://guardiansos-frontend.onrender.com`;

                let contactSms = '';
                let contactEmailHtml = '';

                if (alertLevel === 'Warning') {
                    contactSms = `WARNING: ${user.name} feels unsafe!
Time: ${formattedDate}
Check GuardianSOS App immediately!`;
                    contactEmailHtml = `
                    <div style="background-color: #fef08a; padding: 20px; border: 2px solid #eab308; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ca8a04; margin-top: 0;">WARNING ALERT</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> feels unsafe and triggered a warning.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p>Please contact them immediately or check the GuardianSOS app if you are a registered Guardian.</p>
                        <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
                } else {
                    contactSms = `URGENT SOS: ${user.name} needs help!
Time: ${formattedDate}
Location: ${googleMapsLink}
Battery: ${battery}%
Network: ${network}
Check GuardianSOS app!`;
                    contactEmailHtml = `
                    <div style="background-color: #fee2e2; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ef4444; margin-top: 0;">SOS ALERT!</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> has triggered an emergency alert.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p><strong>Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
                        <p><strong>Battery:</strong> ${battery}%</p>
                        <p><strong>Network:</strong> ${network}</p>
                        <p>Please contact emergency services or check the GuardianSOS app immediately if you are a registered Guardian.</p>
                        <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
                }

                if (contact.phone && client) {
                    client.messages.create({
                        body: contactSms,
                        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                        to: contact.phone
                    }).catch(err => console.error('Twilio Error (ContactPhone):', err.message));
                }

                if (contact.email) {
                    const msg = {
                        to: contact.email,
                        from: 'guardiansosfromguardian.com@gmail.com',
                        subject: emailSubject,
                        text: contactSms,
                        html: contactEmailHtml
                    };
                    emailPromises.push(sgMail.send(msg).catch(err => {
                        console.error('Email Error (ContactEmail):', err.message);
                        if (err.response) {
                            console.error('SendGrid API Error body:', err.response.body);
                        }
                    }));
                }
            });
        }

        await Promise.all(emailPromises.filter(p => p !== null));

        res.json(newSOS);

    } catch (err) {
        console.error('Error triggering SOS:', err);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/sos/cancel
// @desc    Cancel SOS
// @access  Private
router.post('/cancel', auth, async (req, res) => {
    try {
        // Find active SOS for this user
        const activeSOS = await SOS.findOne({
            user: req.user.id,
            isActive: true
        }).sort({ startTime: -1 });

        if (activeSOS) {
            activeSOS.isActive = false;
            activeSOS.endTime = Date.now();
            await activeSOS.save();
        }

        // Update User Status
        await User.findByIdAndUpdate(req.user.id, {
            status: 'Safe'
        });

        // Notify Guardians (Optional: "User is safe now")
        // ... code to send "Safe" email ...

        res.json({ msg: 'SOS Cancelled' });

    } catch (err) {
        console.error('Error cancelling SOS:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

