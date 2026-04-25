const { io } = require('socket.io-client');
const { logger } = require('./logger');

let socket = null;
let discordClient = null;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

/**
 * Inicializa a conexão WebSocket com o painel
 */
function init(client) {
    discordClient = client;
    
    if (socket) {
        socket.disconnect();
    }

    logger.info(`Conectando ao WebSocket do Painel: ${DASHBOARD_URL}`);
    
    socket = io(DASHBOARD_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.on('connect', () => {
        logger.info('Conectado ao WebSocket do Painel!');
        
        // Identificar o bot para cada servidor que ele está
        if (discordClient && discordClient.isReady()) {
            identifyAllGuilds();
        }
    });

    socket.on('disconnect', (reason) => {
        logger.warn(`Desconectado do WebSocket do Painel: ${reason}`);
    });

    socket.on('connect_error', (error) => {
        logger.error('Erro na conexão com o WebSocket do Painel:', error.message);
    });

    // Ouvir comandos vindos do painel via WebSocket (opcional, já que usamos REST)
    socket.on('panel_command', (data) => {
        logger.info('Comando recebido via WebSocket:', data);
    });
}

/**
 * Identifica o bot em todos os servidores no WebSocket
 */
function identifyAllGuilds() {
    if (!socket || !socket.connected || !discordClient) return;

    discordClient.guilds.cache.forEach(guild => {
        socket.emit('identify', {
            type: 'bot',
            guildId: guild.id
        });
    });
    
    logger.info(`Bot identificado em ${discordClient.guilds.cache.size} servidores no WebSocket`);
}

/**
 * Envia um evento para o painel
 */
function emitEvent(guildId, event, payload) {
    if (!socket || !socket.connected) return;

    socket.emit('bot_event', {
        guildId,
        event,
        payload
    });
}

/**
 * Notifica o painel sobre o status do bot
 */
function notifyStatus(guildId, status) {
    if (!socket || !socket.connected) return;
    
    socket.emit('bot_status', {
        status,
        guildId
    });
}

module.exports = {
    init,
    identifyAllGuilds,
    emitEvent,
    notifyStatus
};
