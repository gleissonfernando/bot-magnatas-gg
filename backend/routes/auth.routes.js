const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyJWT, refreshAccessToken } = require('../middleware/jwt.middleware');

// Rotas públicas
router.get('/login', authController.login);
router.get('/callback', authController.callback);
router.post('/refresh', authController.refreshToken);

// Rotas protegidas
router.get('/me', verifyJWT, authController.getMe);
router.post('/logout', verifyJWT, authController.logout);
router.put('/preferences', verifyJWT, authController.updatePreferences);

module.exports = router;
