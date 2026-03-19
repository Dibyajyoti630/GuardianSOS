const express = require('express');
const router = express.Router();
// DEPRECATED (SendGrid) — kept for rollback
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const emailService = require('../utils/brevoEmailService');
const auth = require('../middleware/auth');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Connection = require('../models/Connection');

// @route   POST api/invite/send
// @desc    Send invitation code
// @access  Public
router.post('/send', async (req, res) => {
    const { email, name, type, inviterEmail, phone } = req.body;

    if (!email || !name) {
        return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    try {
        // Validation: Verify User/Guardian Exists
        // If Guardian invites User (guardian_tracking) -> Check User exists
        // If User invites Guardian (guardian_request) -> Check Guardian exists
        if (type === 'guardian_tracking' || type === 'guardian_request') {
            const userExists = await User.findOne({ email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
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
            inviterEmail,
            phone: phone || ''
        });

        await newInvite.save();

        // Prepare Email
        const inviteHtml = `
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
            `;
        const inviteText = `Hello ${name},\n\nYou have been invited to connect on GuardianSOS.\nYour verification code is: ${code}\n\nThis code will expire in 1 hour.`;

        // DEPRECATED (SendGrid) — kept for rollback
        // const msg = { to: email, from: 'guardiansosfromguardian.com@gmail.com', subject: '...', text: inviteText, html: inviteHtml };
        // await sgMail.send(msg);

        const result = await emailService.sendEmail(email, 'GuardianSOS Connection Request', inviteHtml, inviteText);
        if (!result.success) {
            console.error('Brevo Error:', result.error);
            return res.status(500).json({ msg: 'Failed to send email', error: result.error });
        }

        res.json({ msg: 'Invitation sent successfully' });
    } catch (err) {
        console.error('Email Error:', err.message);
        res.status(500).json({ msg: 'Failed to send email', error: err.message });
    }
});

// @route   POST api/invite/verify
// @desc    Verify code and create connection
router.post('/verify', auth, async (req, res) => {
    const { email, code } = req.body;
    // req.user.id is the person verifying (The Guardian)

    try {
        const invite = await Invite.findOne({ email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, code });

        if (!invite) {
            return res.status(400).json({ msg: 'Invalid or expired code' });
        }

        // Code matched

        // If this was a guardian_tracking invite, create a connection
        // The 'email' in the invite is the User's email (target)
        // The person calling verify is the Guardian (req.user.id)
        if (invite.type === 'guardian_tracking') {
            const targetUser = await User.findOne({ email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });

            if (!targetUser) {
                return res.status(400).json({ msg: 'User account not found. They may need to sign up first.' });
            }

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
                    userPhone: invite.phone || '',
                    status: 'active'
                });
                await connection.save();
            }
        }

        // If this was a guardian_request invite, create a connection
        // The 'email' in the invite is the Guardian's email (target)
        // The person calling verify is the User (req.user.id)
        if (invite.type === 'guardian_request') {
            const targetGuardian = await User.findOne({ email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });

            if (!targetGuardian) {
                return res.status(400).json({ msg: 'Guardian account not found. They may need to sign up first.' });
            }

            // Check if active connection already exists
            let connection = await Connection.findOne({
                guardian: targetGuardian._id,
                user: req.user.id,
                status: 'active'
            });

            if (!connection) {
                connection = new Connection({
                    guardian: targetGuardian._id,
                    user: req.user.id,
                    userPhone: invite.phone || '',
                    status: 'active'
                });
                await connection.save();
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
