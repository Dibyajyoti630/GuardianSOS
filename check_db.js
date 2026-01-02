const mongoose = require('mongoose');
const Evidence = require('./backend/models/Evidence');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to DB');
        const evidence = await Evidence.find().sort({ timestamp: -1 }).limit(5);
        console.log('Recent Evidence:', JSON.stringify(evidence, null, 2));
        mongoose.disconnect();
    })
    .catch(err => console.log(err));
