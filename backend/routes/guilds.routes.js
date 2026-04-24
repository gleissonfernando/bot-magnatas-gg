const express = require('express');
const router = express.Router();
const guildsController = require('../controllers/guilds.controller');
const configController = require('../controllers/config.controller');
const { verifyJWT } = require('../middleware/jwt.middleware');

// Todas as rotas requerem autenticação
router.use(verifyJWT);

// ─── Rotas de Servidores ──────────────────────────────────────────────────────

/**
 * GET /api/guilds
 * Listar todos os servidores válidos do usuário (onde o bot está)
 */
router.get('/', guildsController.listValidGuilds);

/**
 * GET /api/guilds/:guildId/details
 * Obter detalhes de um servidor específico
 */
router.get('/:guildId/details', guildsController.getGuildDetails);

/**
 * GET /api/guilds/:guildId/channels
 * Listar canais de um servidor
 */
router.get('/:guildId/channels', guildsController.getGuildChannels);

/**
 * GET /api/guilds/:guildId/roles
 * Listar cargos de um servidor
 */
router.get('/:guildId/roles', guildsController.getGuildRoles);

// ─── Rotas de Configurações ───────────────────────────────────────────────────

/**
 * GET /api/guilds/:guildId/config
 * Obter configurações de um servidor
 */
router.get('/:guildId/config', configController.getGuildConfig);

/**
 * POST /api/guilds/:guildId/config
 * Salvar/atualizar configurações de um servidor
 */
router.post('/:guildId/config', configController.updateGuildConfig);

/**
 * DELETE /api/guilds/:guildId/config
 * Resetar configurações de um servidor
 */
router.delete('/:guildId/config', configController.resetGuildConfig);

/**
 * POST /api/guilds/:guildId/sync
 * Sincronizar dados do servidor
 */
router.post('/:guildId/sync', configController.syncGuildData);

module.exports = router;
