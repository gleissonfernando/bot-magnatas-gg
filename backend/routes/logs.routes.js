const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');
const jwtMiddleware = require('../middleware/jwt.middleware');

// Todas as rotas de logs requerem autenticação
router.use(jwtMiddleware.verifyToken);

/**
 * GET /api/logs/:guildId
 * Buscar logs de um servidor
 * Query params: type, userId, limit, skip, startDate, endDate
 */
router.get('/:guildId', logsController.getLogs);

/**
 * POST /api/logs/:guildId/clear
 * Limpar logs antigos de um servidor
 * Body: { daysOld: 30 }
 */
router.post('/:guildId/clear', logsController.clearOldLogs);

/**
 * GET /api/logs/:guildId/export
 * Exportar logs em CSV
 * Query params: type, startDate, endDate
 */
router.get('/:guildId/export', logsController.exportLogs);

module.exports = router;
