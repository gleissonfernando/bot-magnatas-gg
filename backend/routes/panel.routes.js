const express = require('express');
const router = express.Router();
const panelController = require('../controllers/panel.controller');

/**
 * Rota para enviar mensagens via painel de controle
 * POST /api/panel/send-message
 * 
 * Body:
 * {
 *   guildId: string,
 *   channelId: string,
 *   message: string,
 *   embeds?: object[]
 * }
 */
router.post('/send-message', panelController.sendMessage);

/**
 * Rota para obter configurações de um servidor
 * GET /api/panel/guild/:guildId
 */
router.get('/guild/:guildId', panelController.getGuildSettings);

/**
 * Rota para atualizar configurações de um servidor
 * PUT /api/panel/guild/:guildId
 */
router.put('/guild/:guildId', panelController.updateGuildSettings);

/**
 * Rota para enviar uma mensagem de boas-vindas de teste
 * POST /api/panel/test-welcome
 */
router.post('/test-welcome', panelController.testWelcomeMessage);

/**
 * Rota para enviar uma mensagem de despedida de teste
 * POST /api/panel/test-goodbye
 */
router.post('/test-goodbye', panelController.testGoodbyeMessage);
router.get('/guilds', panelController.listGuilds);
router.get('/guild/test', panelController.healthCheck);
router.get('/verify-dev/:discordId', panelController.verifyDevPermission);

module.exports = router;
