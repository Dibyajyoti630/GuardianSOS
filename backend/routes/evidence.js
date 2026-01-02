const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Evidence = require('../models/Evidence');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// @route   POST api/evidence/upload
// @desc    Upload evidence chunk (video/image)
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const { type, lat, lng, address, deviceId, batchId } = req.body;

        const evidence = new Evidence({
            user: req.user.id,
            type: type || 'video',
            filePath: `/uploads/${req.file.filename}`,
            fileName: req.file.filename,
            location: {
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null,
                address
            },
            deviceId,
            batchId
        });

        await evidence.save();

        res.json(evidence);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/evidence
// @desc    Get all evidence for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const evidence = await Evidence.find({ user: req.user.id }).sort({ timestamp: -1 });
        res.json(evidence);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
