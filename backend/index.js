const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

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
    const banner = await Banner.findOne() || { url: 'https://via.placeholder.com/1200x400?text=SkyFall+Verification' };
    res.json({ url: banner.url });
});

app.post('/api/banner', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    await Banner.findOneAndUpdate({}, { url }, { upsert: true });
    res.json({ message: 'Banner updated successfully!', url });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
