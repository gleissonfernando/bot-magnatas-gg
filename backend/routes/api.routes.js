const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes in this file are protected by authMiddleware
router.use(authMiddleware);

router.get('/me', dataController.getUserData);
router.put('/me', dataController.updateUserData);

module.exports = router;
