const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// --- SECURITY LAYERS ---
app.use(helmet()); // Protects headers and prevents common web attacks
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// Rate Limiting: Max 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter); // Apply rate limiting only to API routes

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 MongoDB Connected (Backend)'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// Simple Banner Schema
const BannerSchema = new mongoose.Schema({
    url: { type: String, default: 'https://via.placeholder.com/1200x400?text=SkyFall+Verification' }
});
const Banner = mongoose.model('Banner', BannerSchema);

// --- ROUTES ---

// Auth Routes (OAuth2 & JWT Issuance)
const authRoutes = require('./routes/auth.routes');
app.use('/', authRoutes);

// Primary API Routes (Protected by JWT)
const apiRoutes = require('./routes/api.routes');
app.use('/api', apiRoutes);

// Public Banner API (Legacy/Public)
app.get('/api/banner', async (req, res) => {
    try {
        const banner = await Banner.findOne() || { url: 'https://via.placeholder.com/1200x400?text=SkyFall+Verification' };
        res.json({ url: banner.url });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/banner', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Valid URL is required' });

        await Banner.findOneAndUpdate({}, { url }, { upsert: true });
        res.json({ message: 'Banner updated successfully!', url });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Global Error Handler (Prevents leaking stack traces)
app.use((err, req, res, next) => {
    console.error('[SERVER_ERROR]:', err.stack);
    res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Secure Backend running on port ${PORT}`));
