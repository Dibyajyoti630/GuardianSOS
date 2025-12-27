const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const auth = require('../middleware/auth');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Connection = require('../models/Connection');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// @route   POST api/invite/send
// @desc    Send invitation code
// @access  Public
router.post('/send', async (req, res) => {
    const { email, name, type, inviterEmail } = req.body;

    if (!email || !name) {
        return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    try {
        // Validation: Verify User/Guardian Exists
        // If Guardian invites User (guardian_tracking) -> Check User exists
        // If User invites Guardian (guardian_request) -> Check Guardian exists
        if (type === 'guardian_tracking' || type === 'guardian_request') {
            const userExists = await User.findOne({ email });
            if (!userExists) {
                return res.status(404).json({ msg: 'Account with this email does not exist' });
            }
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to DB
        // Remove existing invites for this email/type to avoid duplicates
        if (type) {
            await Invite.deleteMany({ email, type });
        }

        const newInvite = new Invite({
            email,
            code,
            type: type || 'general',
            inviterEmail
        });

        await newInvite.save();

        // Prepare Email
        // Note: The 'from' email must be verified in SendGrid. 
        // Using the user's email from the prompt as a best guess.
        const msg = {
            to: email,
            from: 'guardiansosfromguardian.com@gmail.com',
            subject: 'GuardianSOS Connection Request',
            text: `Hello ${name},\n\nYou have been invited to connect on GuardianSOS.\nYour verification code is: ${code}\n\nThis code will expire in 1 hour.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #3b82f6;">GuardianSOS Connection Request</h2>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>You have been invited to connect on GuardianSOS.</p>
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block; margin: 10px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
                    </div>
                    <p>Enter this code in the app to verify your connection.</p>
                    <p style="color: #6b7280; font-size: 14px;">This code will expire in 1 hour.</p>
                </div>
            `,
        };

        await sgMail.send(msg);

        res.json({ msg: 'Invitation sent successfully' });
    } catch (err) {
        console.error('SendGrid Error:', err.response ? err.response.body : err);
        res.status(500).json({ msg: 'Failed to send email', error: err.message });
    }
});

// @route   POST api/invite/verify
// @desc    Verify code and create connection
router.post('/verify', auth, async (req, res) => {
    const { email, code } = req.body;
    // req.user.id is the person verifying (The Guardian)

    try {
        const invite = await Invite.findOne({ email, code });

        if (!invite) {
            return res.status(400).json({ msg: 'Invalid or expired code' });
        }

        // Code matched

        // If this was a guardian_tracking invite, create a connection
        // The 'email' in the invite is the User's email (target)
        // The person calling verify is the Guardian (req.user.id)
        if (invite.type === 'guardian_tracking') {
            const targetUser = await User.findOne({ email: email }); // The user to be tracked

            if (targetUser) {
                // Check if active connection already exists
                let connection = await Connection.findOne({
                    guardian: req.user.id,
                    user: targetUser._id,
                    status: 'active'
                });

                if (!connection) {
                    connection = new Connection({
                        guardian: req.user.id,
                        user: targetUser._id,
                        status: 'active'
                    });
                    await connection.save();
                }
            }
        }

        await Invite.deleteOne({ _id: invite._id });

        res.json({ msg: 'Verified and Connected successfully', invite });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
