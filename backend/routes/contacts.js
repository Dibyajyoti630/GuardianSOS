const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EmergencyContact = require('../models/EmergencyContact');

// @route   GET api/contacts
// @desc    Get all emergency contacts for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const contacts = await EmergencyContact.find({ userId: req.user.id })
            .sort({ isPrimary: -1, createdAt: -1 });
        res.json(contacts);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ msg: 'Server error while fetching contacts' });
    }
});

// @route   POST api/contacts
// @desc    Add new emergency contact
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, phone, email, relationship, isPrimary } = req.body;

    try {
        // Validate required fields
        if (!name || !phone) {
            return res.status(400).json({ msg: 'Name and phone number are required' });
        }

        // Create new contact
        const newContact = new EmergencyContact({
            userId: req.user.id,
            name,
            phone,
            email: email || '',
            relationship: relationship || '',
            isPrimary: isPrimary || false
        });

        const contact = await newContact.save();
        res.json(contact);
    } catch (err) {
        console.error('Error adding contact:', err);
        res.status(500).json({ msg: 'Server error while adding contact', error: err.message });
    }
});

// @route   PUT api/contacts/:id
// @desc    Update emergency contact
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, phone, email, relationship, isPrimary } = req.body;

    try {
        let contact = await EmergencyContact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({ msg: 'Contact not found' });
        }

        // Make sure user owns contact
        if (contact.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to update this contact' });
        }

        // Update fields
        if (name) contact.name = name;
        if (phone) contact.phone = phone;
        if (email !== undefined) contact.email = email;
        if (relationship !== undefined) contact.relationship = relationship;
        if (isPrimary !== undefined) contact.isPrimary = isPrimary;

        await contact.save();
        res.json(contact);
    } catch (err) {
        console.error('Error updating contact:', err);
        res.status(500).json({ msg: 'Server error while updating contact' });
    }
});

// @route   DELETE api/contacts/:id
// @desc    Delete emergency contact
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const contact = await EmergencyContact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({ msg: 'Contact not found' });
        }

        // Make sure user owns contact
        if (contact.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to delete this contact' });
        }

        await EmergencyContact.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Contact deleted successfully' });
    } catch (err) {
        console.error('Error deleting contact:', err);
        res.status(500).json({ msg: 'Server error while deleting contact' });
    }
});

// @route   GET api/contacts/primary
// @desc    Get primary emergency contact
// @access  Private
router.get('/primary', auth, async (req, res) => {
    try {
        const contact = await EmergencyContact.findOne({
            userId: req.user.id,
            isPrimary: true
        });

        if (!contact) {
            return res.status(404).json({ msg: 'No primary contact set' });
        }

        res.json(contact);
    } catch (err) {
        console.error('Error fetching primary contact:', err);
        res.status(500).json({ msg: 'Server error while fetching primary contact' });
    }
});

module.exports = router;
