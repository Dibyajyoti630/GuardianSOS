const express = require('express');
const router = express.Router();
const multer = require('multer');
const Evidence = require('../models/Evidence');
const cloudinary = require('../config/cloudinary');

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   POST api/evidence/upload
// @desc    Upload evidence image
// @access  Public (Called by user during SOS, tokens might be tricky so keeping it simple, assuming client passes userId)
router.post('/upload', upload.single('evidence'), async (req, res) => {
  try {
    console.log('📥 Evidence upload request received');
    console.log('Body:', req.body);
    console.log('File:', req.file ? 'Present' : 'Missing');

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No evidence file provided' 
      });
    }

    const { userId, eventType, cameraType, timestamp, location } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    let parsedLocation;
    try {
        if (location) parsedLocation = JSON.parse(location);
    } catch (e) {
        console.warn('Could not parse location JSON', e);
    }

    console.log('☁️ Uploading to Cloudinary...');

    // Upload to Cloudinary via stream
    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `guardianos/evidence/${userId}`,
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload success:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Generate thumbnail URL
    const thumbnailUrl = cloudinaryResult.secure_url.replace(
      '/upload/', 
      '/upload/c_thumb,w_200,h_200/'
    );

    console.log('💾 Saving to MongoDB...');

    // Save metadata to MongoDB
    const evidence = await Evidence.create({
      userId,
      eventType: eventType || 'SOS_TRIGGER',
      cameraType: cameraType || 'environment',
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      thumbnailUrl,
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      location: parsedLocation,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    console.log('✅ Evidence saved to MongoDB:', evidence._id);

    // Emit to guardians via Socket.IO
    const emitToGuardians = req.app.get('emitToGuardians');
    if (emitToGuardians) {
        emitToGuardians(userId, 'evidence:new', { evidence });
    } else {
        console.warn('emitToGuardians function not found on app, event not emitted');
    }

    // Return success response
    res.json({
      success: true,
      evidenceId: evidence._id,
      url: evidence.url
    });

  } catch (error) {
    console.error('❌ Evidence upload route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Evidence upload failed'
    });
  }
});

// @route   GET api/evidence/:userId
// @desc    Get all evidence for a user
// @access  Public (simplified for guardian access)
router.get('/:userId', async (req, res) => {
    try {
        const evidence = await Evidence.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(50);
        res.json({ success: true, evidence });
    } catch (err) {
        console.error('Get evidence error:', err.message);
        res.status(500).json({ success: false, msg: 'Server Error' });
    }
});

// @route   GET api/evidence/latest/:userId
// @desc    Redirect to the latest evidence image url
// @access  Public (Used for email links)
router.get('/latest/:userId', async (req, res) => {
    try {
        const evidence = await Evidence.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });
        if (evidence && evidence.url) {
            return res.redirect(evidence.url);
        }
        res.status(404).send('No evidence found yet. Please wait a few seconds and try again, or check the dashboard.');
    } catch (err) {
        console.error('Get latest evidence error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
