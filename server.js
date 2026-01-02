const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100MB buffer for large chunks
});

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

// Init Socket Stream
require('./backend/socket_stream')(io);

// Routes
app.get('/', (req, res) => res.send('API RUNNING'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/contacts', require('./backend/routes/contacts'));
app.use('/api/invite', require('./backend/routes/invite'));
app.use('/api/connections', require('./backend/routes/connections'));
app.use('/api/evidence', require('./backend/routes/evidence'));

const PORT = process.env.PORT || 5000;

http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible on network`));
