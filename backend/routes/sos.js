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
        const dashboardLink = `http://localhost:5173/guardiansos/guardian/dashboard`; // Replace with actual domain in prod

        let smsMessage = '';
        let emailSubject = '';
        let emailHtml = '';

        if (alertLevel === 'Warning') {
            smsMessage = `WARNING: ${user.name} feels unsafe and has triggered a Warning alert.
Time: ${new Date().toLocaleTimeString()}
Track Live: ${dashboardLink}`;
            emailSubject = `WARNING ALERT: ${user.name} feels unsafe`;
            emailHtml = `
                    <div style="background-color: #fef08a; padding: 20px; border: 2px solid #eab308; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ca8a04; margin-top: 0;">WARNING ALERT</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> feels unsafe and triggered a warning.</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <div style="margin-top: 20px;">
                            <a href="${dashboardLink}" style="background-color: #eab308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
        } else {
            smsMessage = `URGENT SOS: ${user.name} needs help!
Time: ${new Date().toLocaleTimeString()}
Location: ${googleMapsLink}
Battery: ${battery}%
Network: ${network}
Track Live: ${dashboardLink}`;
            emailSubject = `SOS ALERT: ${user.name} needs help!`;
            emailHtml = `
                    <div style="background-color: #fee2e2; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; font-family: Arial, sans-serif;">
                        <h1 style="color: #ef4444; margin-top: 0;">SOS ALERT!</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> has triggered an emergency alert.</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
                        <p><strong>Battery:</strong> ${battery}%</p>
                        <p><strong>Network:</strong> ${network}</p>
                        <div style="margin-top: 20px;">
                            <a href="${dashboardLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; color: #666;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
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
            return sgMail.send(msg);
        });

        // 4. Notify Emergency Contacts (Non-App Users) via SMS (and Email if they have it)
        if (client) {
            const contacts = await EmergencyContact.find({ userId: req.user.id });
            contacts.forEach(contact => {
                if (contact.phone) {
                    client.messages.create({
                        body: smsMessage,
                        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                        to: contact.phone
                    }).catch(err => console.error('Twilio Error (ContactPhone):', err.message));
                }
                if (contact.email) {
                    const msg = {
                        to: contact.email,
                        from: 'guardiansosfromguardian.com@gmail.com',
                        subject: emailSubject,
                        text: `${smsMessage}\n\nPlease check the GuardianSOS app immediately.`,
                        html: emailHtml
                    };
                    emailPromises.push(sgMail.send(msg).catch(err => console.error('Email Error (ContactEmail):', err.message)));
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

