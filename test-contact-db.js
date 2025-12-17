const mongoose = require('mongoose');
require('dotenv').config();

const EmergencyContact = require('./backend/models/EmergencyContact');
const User = require('./backend/models/User');

async function testContactCreation() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected!');

        // Find a user to test with
        const user = await User.findOne();
        if (!user) {
            console.log('No users found in database. Please create a user first.');
            process.exit(1);
        }

        console.log('Found user:', user._id, user.name, user.email);

        // Try to create a contact
        const testContact = new EmergencyContact({
            userId: user._id,
            name: 'Test Contact',
            phone: '1234567890',
            email: 'test@example.com',
            relationship: 'Friend',
            isPrimary: false
        });

        console.log('Attempting to save contact...');
        console.log('Contact object before save:', JSON.stringify(testContact, null, 2));

        try {
            const savedContact = await testContact.save();
            console.log('Contact saved successfully!', savedContact);

            // Clean up
            await EmergencyContact.findByIdAndDelete(savedContact._id);
            console.log('Test contact deleted');
        } catch (saveErr) {
            console.error('Error saving contact:');
            console.error('Name:', saveErr.name);
            console.error('Message:', saveErr.message);
            if (saveErr.errors) {
                console.error('Validation errors:', JSON.stringify(saveErr.errors, null, 2));
            }
            console.error('Stack:', saveErr.stack);
            throw saveErr;
        }

        await mongoose.connection.close();
        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Error during test:');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testContactCreation();
