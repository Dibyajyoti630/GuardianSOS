const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected for simulation...');
        startSimulation();
    })
    .catch(err => console.log(err));

async function startSimulation() {
    // Find the user to simulate (Dibyajyoti or any user that isn't the guardian)
    // For safety, let's find a user by email 'dibyajyotinayak@gmail.com' (from the screenshot context)
    // Or just the first non-guardian user.

    try {
        const user = await User.findOne({ email: 'dibyajyotinayak@gmail.com' });

        if (!user) {
            console.log("Target user 'dibyajyotinayak@gmail.com' not found. Creating or finding another...");
            // Fallback to finding any user
            const anyUser = await User.findOne({ role: 'user' });
            if (anyUser) {
                console.log(`Found fallback user: ${anyUser.name}`);
                runLoop(anyUser);
            } else {
                console.log("No users found to simulate.");
                process.exit();
            }
        } else {
            console.log(`Starting simulation for: ${user.name}`);
            runLoop(user);
        }

    } catch (err) {
        console.error(err);
    }
}

async function runLoop(user) {
    // Starting point (Connaught Place)
    let lat = 28.6139;
    let lng = 77.2090;

    setInterval(async () => {
        // Move slightly
        lat += (Math.random() - 0.5) * 0.001;
        lng += (Math.random() - 0.5) * 0.001;

        // Drain battery slightly
        let battery = user.batteryLevel || 100;
        if (Math.random() > 0.9) battery = Math.max(0, battery - 1);

        try {
            user.lastKnownLocation = {
                lat: lat,
                lng: lng,
                address: `Simulated Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                updatedAt: new Date()
            };
            user.batteryLevel = battery;

            await user.save();
            console.log(`Updated ${user.name}: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}, Bat ${battery}%`);
        } catch (err) {
            console.error("Update failed:", err.message);
        }
    }, 3000); // Update every 3 seconds
}
