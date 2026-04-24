const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

dotenv.config();

const app = express();

// --- SECURITY LAYERS ---
app.use(helmet()); // Protege headers e previne ataques comuns
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado limite de payload para evitar erros de tamanho

// Rate Limiting: REMOVIDO/AUMENTADO para evitar bloqueios no OAuth2 e Dashboard
// Agora permite 10.000 requisições a cada 15 minutos (praticamente ilimitado para uso normal)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000, 
    message: { error: 'Limite de requisições excedido. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter); 

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('🍃 MongoDB Connected (Backend)'))
    .catch(err => logger.error('❌ MongoDB Error:', err));

// Simple Banner Schema
const BannerSchema = new mongoose.Schema({
    url: { type: String, default: 'https://via.placeholder.com/1200x400?text=Magnatas+Verification' }
});
const Banner = mongoose.model('Banner', BannerSchema);

// --- ROUTES ---

// Auth Routes (OAuth2 & JWT Issuance)
const authRoutes = require('./routes/auth.routes');
app.use('/', authRoutes);

// Primary API Routes (Protected by JWT)
const apiRoutes = require('./routes/api.routes');
app.use('/api', apiRoutes);

// Guilds Routes (Server Management)
const guildsRoutes = require('./routes/guilds.routes');
app.use('/api/guilds', guildsRoutes);

// Panel Routes (Dashboard Integration)
const panelRoutes = require('./routes/panel.routes');
app.use('/api/panel', panelRoutes);

// Export setDiscordClient for use in main bot file
app.setDiscordClient = (client) => {
    const panelController = require('./controllers/panel.controller');
    panelController.setDiscordClient(client);
};

// Public Banner API
app.get('/api/banner', async (req, res) => {
    try {
        const banner = await Banner.findOne() || { url: 'https://via.placeholder.com/1200x400?text=Magnatas+Verification' };
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

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('[SERVER_ERROR]:', err);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`🚀 Backend Magnatas rodando na porta ${PORT} (Sem limites de OAuth2)`));
