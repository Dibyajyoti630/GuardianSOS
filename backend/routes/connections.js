const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Connection = require('../models/Connection');
const User = require('../models/User');
const Invite = require('../models/Invite');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// @route   GET api/connections/guardians
// @desc    Get all active guardians tracking the current user
// @access  Private (User)
router.get('/guardians', auth, async (req, res) => {
    try {
        // Active Connections
        const connections = await Connection.find({
            user: req.user.id
            // Removed status: 'active' to show ALL connections (including inactive)
        }).populate('guardian', 'name email profilePicture');

        // Pending Invites (sent by User to Guardian)
        const user = await User.findById(req.user.id);
        const pendingInvites = await Invite.find({
            inviterEmail: user.email,
            type: 'guardian_request'
        });

        const activeList = connections.map(conn => {
            if (!conn.guardian) return null; // Skip if guardian not found
            return {
                id: conn._id,
                name: conn.guardian.name,
                email: conn.guardian.email,
                status: conn.status, // Use actual status from DB
                type: 'connection',
                guardian: conn.guardian // Include full object for legacy checks if needed
            };
        }).filter(item => item !== null);

        const pendingList = pendingInvites.map(invite => ({
            id: invite._id, // Use Invite ID
            name: invite.name || invite.email, // Invite might only have email if name wasn't saved, but invite/send requires name
            email: invite.email,
            status: 'Pending',
            type: 'invite'
        }));

        res.json([...activeList, ...pendingList]);
    } catch (err) {
        console.error('Error fetching guardians:', err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/connections/:id
// @desc    Remove a guardian (Connection or Invite)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    const { type } = req.query; // 'connection' or 'invite'
    const id = req.params.id;

    try {
        const user = await User.findById(req.user.id);
        let guardianEmail = '';
        let guardianName = '';

        if (type === 'connection') {
            const connection = await Connection.findOne({
                _id: id,
                user: req.user.id
            }).populate('guardian');

            if (!connection) {
                return res.status(404).json({ msg: 'Connection not found' });
            }

            guardianEmail = connection.guardian.email;
            guardianName = connection.guardian.name;

            await Connection.deleteOne({ _id: id });

        } else if (type === 'invite') {
            const invite = await Invite.findById(id);
            if (!invite) {
                return res.status(404).json({ msg: 'Invite not found' });
            }

            // Check authorization (ensure user owns this invite)
            if (invite.inviterEmail !== user.email) {
                return res.status(401).json({ msg: 'Not authorized' });
            }

            guardianEmail = invite.email;
            guardianName = invite.name || 'Guardian'; // Invite usually stores name

            await Invite.deleteOne({ _id: id });
        } else {
            return res.status(400).json({ msg: 'Invalid type' });
        }

        // Send Removal Email if email exists
        if (guardianEmail) {
            const msg = {
                to: guardianEmail,
                from: 'guardiansosfromguardian.com@gmail.com',
                subject: 'Guardian Access Removed',
                text: `Hello ${guardianName},\n\n${user.name} has removed you as a guardian on GuardianSOS. You will no longer receive their safety alerts or location updates.\n\nStay Safe,\nThe GuardianSOS Team`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                        <h2 style="color: #ef4444;">Guardian Access Removed</h2>
                        <p>Hello <strong>${guardianName}</strong>,</p>
                        <p><strong>${user.name}</strong> has removed you as a guardian on GuardianSOS.</p>
                        <p>You will no longer receive their safety alerts or location updates.</p>
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #6b7280; font-size: 14px;">The GuardianSOS Team</p>
                    </div>
                `,
            };
            try {
                await sgMail.send(msg);
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr);
                // Continue even if email fails
            }
        }

        res.json({ msg: 'Guardian removed successfully' });

    } catch (err) {
        console.error('Error removing guardian:', err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/connections/users
// @desc    Get all users connected to the current guardian
// @access  Private (Guardian)
router.get('/users', auth, async (req, res) => {
    try {
        const connections = await Connection.find({
            guardian: req.user.id
        }).populate('user', 'name email profilePicture emergencyContact batteryLevel lastKnownLocation');

        const userList = connections.map(conn => ({
            connectionId: conn._id,
            userId: conn.user._id,
            name: conn.user.name,
            email: conn.user.email,
            status: conn.status, // active or inactive
            battery: conn.user.batteryLevel || 'Unknown', // hypothetical fields
            location: conn.user.lastKnownLocation || null
        }));

        res.json(userList);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/connections/:id
// @desc    Update connection status (e.g. stop/start tracking)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { status } = req.body;

    try {
        const connection = await Connection.findById(req.params.id);

        if (!connection) {
            return res.status(404).json({ msg: 'Connection not found' });
        }

        // Ensure the requester is the guardian of this connection
        if (connection.guardian.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        connection.status = status;
        await connection.save();

        res.json(connection);
    } catch (err) {
        console.error('Error updating connection:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
