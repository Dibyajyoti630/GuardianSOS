const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = router;
