require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/guardiansos')
  .then(async () => {
    const SOS = require('./models/SOS');
    const User = require('./models/User');

    const result = await SOS.updateMany(
      { user: '6942c02a896da1ddd01ca1d3', isActive: true },
      { $set: { isActive: false, endTime: new Date() } }
    );
    console.log('Update result SOS:', result);
    
    await User.findByIdAndUpdate('6942c02a896da1ddd01ca1d3', {
      status: 'Safe',
      isUnreachable: false,
      unreachableSince: null,
      disconnectType: null
    });
    console.log('Reset user status');

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
