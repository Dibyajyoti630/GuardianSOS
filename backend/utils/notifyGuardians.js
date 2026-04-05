// DEPRECATED (SendGrid) — kept for rollback
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailService = require('./brevoEmailService');
const twilio = require('twilio');
const User = require('../models/User');
const Connection = require('../models/Connection');
const EmergencyContact = require('../models/EmergencyContact');

/**
 * Sends SMS and Email notifications to a user's guardians and emergency contacts.
 * 
 * @param {Object} params
 * @param {string} params.userId - The ID of the user who triggered the alert
 * @param {string} params.alertLevel - 'SOS', 'Warning', or 'Unreachable'
 * @param {Object} [params.location] - Optional location object { lat, lng, address }
 * @param {string} [params.battery] - Optional battery percentage
 * @param {string} [params.network] - Optional network signal strength
 */
// async function notifyGuardians({ userId, alertLevel, location, battery = 'Unknown', network = 'Unknown' }) {
//     try {
//         const connections = await Connection.find({
//             user: userId,
//             status: 'active'
//         }).populate('guardian', 'email name phone');

//         const user = await User.findById(userId);
//         if (!user) {
//             console.error(`[Notify] User not found: ${userId}`);
//             return;
//         }

//         const googleMapsUrl = location && location.lat && location.lng
//             ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
//             : null;

//         const googleMapsLinkTemplate = googleMapsUrl 
//             ? `<a href="${googleMapsUrl}" style="color: #dc2626;">View on Google Maps</a>`
//             : `<span>Location unavailable</span>`;

//         const googleMapsText = googleMapsUrl || 'Unknown Location';

//         const locationText = location && location.address ? location.address : googleMapsText;

//         const backendUrl = process.env.BACKEND_URL || 'https://guardiansos-backend.onrender.com';
async function notifyGuardians({ userId, alertLevel, location, battery = 'Unknown', network = 'Unknown' }) {
    try {
        const connections = await Connection.find({
            user: userId,
            status: 'active'
        }).populate('guardian', 'email name phone');

        const user = await User.findById(userId);
        if (!user) {
            console.error(`[Notify] User not found: ${userId}`);
            return;
        }

        // Check if location is valid (not 0,0 fallback)
        const hasValidLocation = location && location.lat && location.lng && !(location.lat === 0 && location.lng === 0);

        const googleMapsUrl = hasValidLocation
            ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
            : null;

        const googleMapsLinkTemplate = googleMapsUrl
            ? `<a href="${googleMapsUrl}" style="color: #dc2626;">View on Google Maps</a>`
            : `<span style="color: #dc2626;">Location unavailable</span>`;

        const googleMapsText = googleMapsUrl
            ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
            : 'Location unavailable';

        const locationText = location && location.address
            ? location.address
            : (hasValidLocation ? googleMapsText : 'Location unavailable');

        const backendUrl = process.env.BACKEND_URL || 'https://guardiansos-backend.onrender.com';

        // ... rest of the function stays the same

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
        }).toUpperCase();

        let emailSubject = '';
        let smsMessageTemplate = '';
        let emailHtmlTemplate = '';

        // --- BRANCHING LOGIC BASED ON ALERT LEVEL ---
        if (alertLevel === 'SOS' || alertLevel === 'Warning') {
            if (alertLevel === 'Warning') {
                emailSubject = `WARNING ALERT: ${user.name} feels unsafe`;
                smsMessageTemplate = `WARNING: ${user.name} feels unsafe and has triggered a Warning alert.\nTime: ${formattedDate}\nTrack Live: {dashboardLink}`;
                emailHtmlTemplate = `
                    <div style="background-color: #fef08a; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #eab308; border-radius: 8px; font-family: Arial, sans-serif; color: #854d0e;">
                        <h1 style="color: #ca8a04; margin-top: 0;">WARNING ALERT</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> feels unsafe and triggered a warning.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <div style="margin-top: 20px;">
                            <a href="{dashboardLink}" style="background-color: #eab308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            } else {
                emailSubject = `SOS ALERT: ${user.name} needs help!`;
                smsMessageTemplate = `URGENT SOS: ${user.name} needs help!\nTime: ${formattedDate}\nLocation: ${googleMapsText}\nBattery: ${battery}%\nNetwork: ${network}\nTrack Live: {dashboardLink}`;
                emailHtmlTemplate = `
                    <div style="background-color: #fee2e2; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; font-family: Arial, sans-serif; color: #991b1b;">
                        <h1 style="color: #ef4444; margin-top: 0;">SOS ALERT!</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> has triggered an emergency alert.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p><strong>Location:</strong> ${googleMapsLinkTemplate}</p>
                        <p><strong>Evidence:</strong> <a href="${backendUrl}/api/evidence/latest/${userId}" style="color: #dc2626;">📸 View Captured Photo</a></p>
                        <p><strong>Battery:</strong> ${battery}%</p>
                        <p><strong>Network:</strong> ${network}</p>
                        <div style="margin-top: 20px;">
                            <a href="{dashboardLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                        </div>
                         <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            }
        } else if (alertLevel === 'Unreachable') {
            emailSubject = `⚠️ GuardianSOS Alert — ${user.name} is unreachable`;
            smsMessageTemplate = `⚠️ GuardianSOS Alert: ${user.name} disconnected unexpectedly.\nLast known location: ${locationText}\nLast seen: ${formattedDate}\nPlease check on them immediately. Track: {dashboardLink}`;
            emailHtmlTemplate = `
                <div style="background-color: #ffedd5; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #f97316; border-radius: 8px; font-family: Arial, sans-serif; color: #c2410c;">
                    <h1 style="color: #ea580c; margin-top: 0;">⚠️ User Unreachable</h1>
                    <p style="font-size: 18px;"><strong>${user.name}</strong> disconnected unexpectedly.</p>
                    <p><strong>Last known location:</strong> ${locationText}</p>
                    <p><strong>Last seen:</strong> ${formattedDate}</p>
                    <p>Please check on them immediately.</p>
                    <div style="margin-top: 20px;">
                        <a href="{dashboardLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Live Dashboard</a>
                    </div>
                     <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                </div>
            `;
        } else if (alertLevel === 'Safe') {
            emailSubject = `SAFE UPDATE: ${user.name} is now safe`;
            smsMessageTemplate = `SAFE UPDATE: ${user.name} is now marked as Safe.\nTime: ${formattedDate}\nTrack Live: {dashboardLink}`;
            emailHtmlTemplate = `
                <div style="background-color: #dcfce7; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #22c55e; border-radius: 8px; font-family: Arial, sans-serif; color: #166534;">
                    <h1 style="color: #15803d; margin-top: 0;">SAFE UPDATE</h1>
                    <p style="font-size: 18px;"><strong>${user.name}</strong> is now marked as Safe.</p>
                    <p><strong>Time:</strong> ${formattedDate}</p>
                    <div style="margin-top: 20px;">
                        <a href="{dashboardLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Dashboard</a>
                    </div>
                     <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                </div>
            `;
        } else {
            console.error(`[Notify] Unknown alert level: ${alertLevel}`);
            return;
        }

        // Initialize Twilio
        let client;
        try {
            client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        } catch (e) {
            console.error("[Notify] Twilio Init Failed", e);
        }

        console.log(`[Notify] Sending notifications to ${connections.length} guardian(s) for alert level: ${alertLevel}`);

        const frontendUrl = process.env.FRONTEND_URL || 'https://guardiansos-frontend.onrender.com';
        const generalDashboardLink = frontendUrl;

        const emailPromises = connections.map(conn => {
            if (!conn.guardian) return null;

            const personalizedDashboardLink = `${frontendUrl}/guardiansos/guardian/dashboard?target=${userId}&auth=${encodeURIComponent(conn.guardian.email)}`;

            const smsMessage = smsMessageTemplate.replace('{dashboardLink}', personalizedDashboardLink);
            const emailHtml = emailHtmlTemplate.replace('{dashboardLink}', personalizedDashboardLink);

            // Send SMS to Guardian if they have a phone number
            if (conn.guardian.phone && client) {
                client.messages.create({
                    body: smsMessage,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    to: conn.guardian.phone
                }).catch(err => console.error('[Notify] Twilio Error (Guardian):', err.message));
            }

            // DEPRECATED (SendGrid) — kept for rollback
            // const msg = {
            //     to: conn.guardian.email,
            //     from: 'guardiansosfromguardian.com@gmail.com',
            //     subject: emailSubject,
            //     text: `${smsMessage}\n\nPlease check the GuardianSOS app immediately.`,
            //     html: emailHtml
            // };
            // return sgMail.send(msg).then(...).catch(...);

            console.log(`[Notify] Sending email to: ${conn.guardian.email}`);
            return emailService.sendEmail(
                conn.guardian.email,
                emailSubject,
                emailHtml,
                `${smsMessage}\n\nPlease check the GuardianSOS app immediately.`
            ).then(result => {
                if (result.success) {
                    console.log(`[Notify] Email sent successfully to: ${conn.guardian.email}`);
                } else {
                    console.error(`[Notify] Email FAILED to: ${conn.guardian.email}`, result.error);
                }
            });
        });

        // 5. Notify Emergency Contacts (Only if SOS or Warning, or maybe Unreachable as well. Let's do it for all).
        const contacts = await EmergencyContact.find({ userId: userId });
        contacts.forEach(contact => {
            let contactSms = '';
            let contactEmailHtml = '';

            if (alertLevel === 'Warning') {
                contactSms = `WARNING: ${user.name} feels unsafe!\nTime: ${formattedDate}\nCheck GuardianSOS App immediately!`;
                contactEmailHtml = `
                    <div style="background-color: #fef08a; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #eab308; border-radius: 8px; font-family: Arial, sans-serif; color: #854d0e;">
                        <h1 style="color: #ca8a04; margin-top: 0;">WARNING ALERT</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> feels unsafe and triggered a warning.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p>Please contact them immediately or check the GuardianSOS app if you are a registered Guardian.</p>
                        <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            } else if (alertLevel === 'SOS') {
                contactSms = `URGENT SOS: ${user.name} needs help!\nTime: ${formattedDate}\nLocation: ${googleMapsText}\nBattery: ${battery}%\nNetwork: ${network}\nCheck GuardianSOS app!`;
                contactEmailHtml = `
                    <div style="background-color: #fee2e2; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; font-family: Arial, sans-serif; color: #991b1b;">
                        <h1 style="color: #ef4444; margin-top: 0;">SOS ALERT!</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> has triggered an emergency alert.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p><strong>Location:</strong> ${googleMapsLinkTemplate}</p>
                        <p><strong>Evidence:</strong> <a href="${backendUrl}/api/evidence/latest/${userId}" style="color: #dc2626;">📸 View Captured Photo</a></p>
                        <p><strong>Battery:</strong> ${battery}%</p>
                        <p><strong>Network:</strong> ${network}</p>
                        <p>Please contact emergency services or check the GuardianSOS app immediately if you are a registered Guardian.</p>
                        <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            } else if (alertLevel === 'Unreachable') {
                contactSms = `⚠️ GuardianSOS Alert: ${user.name} disconnected unexpectedly.\nLast known location: ${locationText}\nLast seen: ${formattedDate}\nPlease check on them immediately.`;
                contactEmailHtml = `
                    <div style="background-color: #ffedd5; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #f97316; border-radius: 8px; font-family: Arial, sans-serif; color: #c2410c;">
                        <h1 style="color: #ea580c; margin-top: 0;">⚠️ User Unreachable</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> disconnected unexpectedly.</p>
                        <p><strong>Last known location:</strong> ${locationText}</p>
                        <p><strong>Last seen:</strong> ${formattedDate}</p>
                        <p>Please contact them immediately or check the GuardianSOS app if you are a registered Guardian.</p>
                        <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            } else if (alertLevel === 'Safe') {
                contactSms = `SAFE UPDATE: ${user.name} is now marked as Safe.\nTime: ${formattedDate}\nCheck GuardianSOS app.`;
                contactEmailHtml = `
                    <div style="background-color: #dcfce7; background-image: url('https://res.cloudinary.com/dysrjp0dg/image/upload/o_15/v1774085430/guardiansos/email_assets/ifjmch5bimk6jrbz1erl.png'); background-size: cover; background-position: center; padding: 20px; border: 2px solid #22c55e; border-radius: 8px; font-family: Arial, sans-serif; color: #166534;">
                        <h1 style="color: #15803d; margin-top: 0;">SAFE UPDATE</h1>
                        <p style="font-size: 18px;"><strong>${user.name}</strong> is now marked as Safe.</p>
                        <p><strong>Time:</strong> ${formattedDate}</p>
                        <p>We wanted to let you know that the situation has been marked as Safe.</p>
                        <p style="margin-top: 20px; font-size: 12px;">This is an automated message from GuardianSOS.</p>
                    </div>
                `;
            }

            if (contact.phone && client) {
                client.messages.create({
                    body: contactSms,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    to: contact.phone
                }).catch(err => console.error('[Notify] Twilio Error (ContactPhone):', err.message));
            }

            if (contact.email) {
                // DEPRECATED (SendGrid) — kept for rollback
                // emailPromises.push(sgMail.send({ to: contact.email, ... }));

                emailPromises.push(
                    emailService.sendEmail(
                        contact.email,
                        emailSubject,
                        contactEmailHtml,
                        contactSms
                    ).then(result => {
                        if (result.success) {
                            console.log(`[Notify] Email sent to emergency contact: ${contact.email}`);
                        } else {
                            console.error(`[Notify] Email FAILED to emergency contact: ${contact.email}`, result.error);
                        }
                    })
                );
            }
        });

        // Wait for all emails/SMS in background
        Promise.all(emailPromises.filter(p => p !== null)).then(() => {
            console.log('[Notify] All notifications processed.');
        }).catch(err => {
            console.error('[Notify] Some notifications failed:', err);
        });

    } catch (err) {
        console.error('[Notify] Error in notifyGuardians:', err);
    }
}

module.exports = { notifyGuardians };
