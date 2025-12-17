const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// DB Config
const db = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(db)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// Routes
app.get('/', (req, res) => res.send('API RUNNING'));
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/contacts', require('./backend/routes/contacts'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible on network`));
