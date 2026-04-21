const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('dotenv').config().parsed || process.env;

// Use the secret from .env or a fallback for development
const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production';

const generateToken = (payload) => {
    return jwt.sign(payload, secret, { expiresIn: '7d' });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken
};
