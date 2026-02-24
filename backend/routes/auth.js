const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth'); // Import auth middleware

// Register User
router.post('/signup', async (req, res) => {
    const { name, email, password, role, emergencyContact } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            password,
            role,
            emergencyContact
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
            }
        );

    } catch (err) {
        console.log("SIGNUP ERROR:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Google OAuth Login
router.post('/google', async (req, res) => {
    console.log('Google OAuth endpoint hit!');
    console.log('Request body:', req.body);
    const { userInfo, role } = req.body;

    try {
        const { email, name, picture } = userInfo;

        if (!email || !name) {
            return res.status(400).json({ msg: 'Invalid user information from Google' });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = new User({
                name,
                email,
                password: 'google-oauth-' + Math.random().toString(36), // Random password for OAuth users
                role: role || 'user',
                googleId: userInfo.sub,
                profilePicture: picture
            });

            await user.save();
        }

        // Generate JWT token
        const jwtPayload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        profilePicture: user.profilePicture
                    }
                });
            }
        );

    } catch (err) {
        console.error('Google OAuth Error:', err);
        res.status(500).json({ msg: 'Google authentication failed', error: err.message });
    }
});

// Update User Status (Location & Battery)
router.put('/update-status', auth, async (req, res) => {
    // Note: Using 'auth' middleware now, so we can use req.user.id
    // But allowing fallback to email if necessary for testing legacy integration
    const { email, location, battery, networkSignal, wifiStatus } = req.body;

    try {
        // Find user by req.user.id first, fallback to email if testing (though auth enforces req.user)
        let user = await User.findById(req.user.id);

        if (!user && email) {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const activities = [];

        if (location) {
            user.lastKnownLocation = {
                lat: location.lat,
                lng: location.lng,
                address: location.address,
                updatedAt: new Date()
            };

            // Log location activity
            if (location.address) {
                activities.push({
                    userId: user._id,
                    type: 'location',
                    text: `Location updated: ${location.address}`
                });
            }
        }

        if (battery !== undefined && battery !== null) {
            user.batteryLevel = battery;
            if (battery <= 20) {
                activities.push({
                    userId: user._id,
                    type: 'battery',
                    text: `Battery level is low: ${battery}%`
                });
            }
        }

        if (networkSignal !== undefined && networkSignal !== null) {
            user.networkSignal = networkSignal;
            activities.push({
                userId: user._id,
                type: 'network',
                text: `Network signal: ${networkSignal}`
            });
        }

        if (wifiStatus !== undefined && wifiStatus !== null) {
            user.wifiStatus = wifiStatus;
        }

        await user.save();

        // Save all generated activities
        if (activities.length > 0) {
            await Activity.insertMany(activities);
        }

        res.json({ msg: 'Status updated', location: user.lastKnownLocation });

    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/activity
// @desc    Get current user recent activity
// @access  Private
router.get('/activity', auth, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(activities);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
