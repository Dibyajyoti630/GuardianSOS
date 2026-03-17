const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SOS = require('../models/SOS');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Activity = require('../models/Activity');
const { notifyGuardians } = require('../utils/notifyGuardians');

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

        // Log Activity text
        const activityText = alertLevel === 'Warning'
            ? 'Triggered a Warning Alert'
            : 'Triggered an SOS Emergency Alert!';

        // 2. Run all critical DB writes in PARALLEL for speed
        await Promise.all([
            newSOS.save(),
            User.findByIdAndUpdate(req.user.id, {
                status: alertLevel,
                lastKnownLocation: location,
                batteryLevel: battery !== 'Unknown' ? battery : undefined,
                networkSignal: network !== 'Unknown' ? network : undefined
            }),
            Activity.create({
                userId: req.user.id,
                type: 'status',
                text: activityText
            }),
            (location && location.address)
                ? Activity.create({
                    userId: req.user.id,
                    type: 'location',
                    text: `Alert Location: ${location.address}`
                })
                : Promise.resolve()
        ]);

        // 3. Respond to frontend IMMEDIATELY (don't wait for emails)
        res.json(newSOS);

        // 3b. CHANGED: Scoped emit — only reaches this user's connected guardians (was: global broadcast)
        const scopedEmit = req.app.get('emitToGuardians');
        if (scopedEmit) {
            scopedEmit(req.user.id, 'sos-status-change', {
                userId: req.user.id,
                status: alertLevel,
                location
            });
            console.log(`[SOS] Scoped socket event emitted: sos-status-change (${alertLevel}) for user ${req.user.id}`);
        } else {
            console.error('[SOS] WARNING: emitToGuardians not available, socket event NOT emitted!');
        }

        // 4. Notify Guardians & Emergency Contacts (fire-and-forget, wrapped in own try-catch)
        // This runs AFTER response is sent, so errors here must NOT call res.status()
        try {
            await notifyGuardians({
                userId: req.user.id,
                alertLevel,
                location,
                battery,
                network
            });
        } catch (notifyErr) {
            // This catch is for the fire-and-forget section ONLY
            // Response is already sent, so we just log the error
            console.error('[SOS] Notification section error (response already sent):', notifyErr);
        }

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
        }

        // Run all DB writes in parallel for speed
        await Promise.all([
            activeSOS ? activeSOS.save() : Promise.resolve(),
            User.findByIdAndUpdate(req.user.id, { status: 'Safe' }),
            Activity.create({
                userId: req.user.id,
                type: 'status',
                text: 'Marked as Safe. Alert cancelled.'
            })
        ]);

        res.json({ msg: 'SOS Cancelled' });

        // CHANGED: Scoped emit — only reaches this user's connected guardians (was: global broadcast)
        const scopedEmit = req.app.get('emitToGuardians');
        if (scopedEmit) {
            scopedEmit(req.user.id, 'sos-status-change', {
                userId: req.user.id,
                status: 'Safe'
            });
        }

    } catch (err) {
        console.error('Error cancelling SOS:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

