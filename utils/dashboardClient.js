/**
 * Dashboard Client — Magnatas.gg
 *
 * Responsável por enviar eventos e logs do Bot para o Painel de Controle
 * em tempo real via HTTP (tRPC public endpoint).
 *
 * O painel expõe o endpoint público:
 *   POST /trpc/realTimeLogs.createLog
 *
 * O bot também expõe um endpoint REST para o painel buscar logs:
 *   GET /api/panel/logs/:guildId
 */

const axios = require('axios');
const { logger } = require('./logger');

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:5000';

// Timeout para chamadas ao painel (não bloqueia o bot em caso de falha)
const TIMEOUT_MS = 5000;

/**
 * Envia um log em tempo real para o painel de controle.
 * A chamada é feita em background (fire-and-forget) para não bloquear o bot.
 *
 * @param {object} payload - Dados do log
 * @param {string} payload.guildId
 * @param {string} payload.title
 * @param {string} payload.description
 * @param {string} [payload.type]          - Tipo do evento (ex: member_join, ban, etc.)
 * @param {string} [payload.userId]
 * @param {string} [payload.userName]
 * @param {number} [payload.color]         - Cor do embed em decimal
 * @param {string} [payload.footer]
 * @param {string} [payload.imageUrl]
 * @param {Array}  [payload.fields]        - Campos extras do embed
 */
async function sendLogToDashboard(payload) {
    try {
        await axios.post(
            `${DASHBOARD_API_URL}/trpc/realTimeLogs.createLog`,
            {
                json: {
                    guildId:     payload.guildId,
                    title:       payload.title       || 'Evento',
                    description: payload.description || '',
                    type:        payload.type        || 'info',
                    userId:      payload.userId      || undefined,
                    userName:    payload.userName    || undefined,
                    color:       payload.color       || 0x5865F2,
                    footer:      payload.footer      || 'Magnatas.gg • Bot',
                    imageUrl:    payload.imageUrl    || undefined,
                    fields:      payload.fields      || [],
                },
            },
            {
                timeout: TIMEOUT_MS,
                headers: { 'Content-Type': 'application/json' },
            }
        );
        logger.debug(`[DashboardClient] Log enviado ao painel: ${payload.title}`);
    } catch (err) {
        // Falha silenciosa — o painel pode estar offline, o bot não deve parar por isso
        logger.debug(`[DashboardClient] Painel indisponível ou erro ao enviar log: ${err.message}`);
    }
}

/**
 * Atalhos semânticos por tipo de evento
 */

function sendMemberJoinLog(guildId, member) {
    return sendLogToDashboard({
        guildId,
        title: `👋 ${member.user.username} entrou no servidor`,
        description: `**Tag:** ${member.user.tag}\n**ID:** ${member.id}`,
        type: 'member_join',
        userId: member.id,
        userName: member.user.username,
        color: 0x2ECC71,
        footer: 'Magnatas.gg • Entrada de Membro',
    });
}

function sendMemberLeaveLog(guildId, member) {
    return sendLogToDashboard({
        guildId,
        title: `🚪 ${member.user.username} saiu do servidor`,
        description: `**Tag:** ${member.user.tag}\n**ID:** ${member.id}`,
        type: 'member_leave',
        userId: member.id,
        userName: member.user.username,
        color: 0xFF6B6B,
        footer: 'Magnatas.gg • Saída de Membro',
    });
}

function sendBanLog(guildId, executor, targetUser, reason) {
    return sendLogToDashboard({
        guildId,
        title: `🔨 ${targetUser.tag} foi banido`,
        description: `**Banido por:** ${executor.tag}\n**Motivo:** ${reason}`,
        type: 'ban',
        userId: executor.id,
        userName: executor.tag,
        color: 0xFF0000,
        footer: 'Magnatas.gg • Moderação',
        fields: [
            { name: 'Usuário Banido', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
            { name: 'Executado por',  value: `${executor.tag} (${executor.id})`,     inline: true },
            { name: 'Motivo',         value: reason,                                  inline: false },
        ],
    });
}

function sendKickLog(guildId, executor, targetUser, reason) {
    return sendLogToDashboard({
        guildId,
        title: `👢 ${targetUser.tag} foi expulso`,
        description: `**Expulso por:** ${executor.tag}\n**Motivo:** ${reason}`,
        type: 'kick',
        userId: executor.id,
        userName: executor.tag,
        color: 0xFF8C00,
        footer: 'Magnatas.gg • Moderação',
        fields: [
            { name: 'Usuário Expulso', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
            { name: 'Executado por',   value: `${executor.tag} (${executor.id})`,     inline: true },
            { name: 'Motivo',          value: reason,                                  inline: false },
        ],
    });
}

function sendClearLog(guildId, executor, channelName, amount) {
    return sendLogToDashboard({
        guildId,
        title: `🧹 ${amount} mensagens limpas`,
        description: `**Canal:** #${channelName}\n**Executado por:** ${executor.tag}`,
        type: 'message_delete',
        userId: executor.id,
        userName: executor.tag,
        color: 0xFFA500,
        footer: 'Magnatas.gg • Limpeza de Mensagens',
        fields: [
            { name: 'Quantidade', value: String(amount),  inline: true },
            { name: 'Canal',      value: `#${channelName}`, inline: true },
        ],
    });
}

function sendCommandLog(guildId, executor, commandName, extra) {
    return sendLogToDashboard({
        guildId,
        title: `⚙️ Comando /${commandName} executado`,
        description: `**Usuário:** ${executor.tag}\n${extra || ''}`,
        type: 'command',
        userId: executor.id,
        userName: executor.tag,
        color: 0x5865F2,
        footer: 'Magnatas.gg • Comando',
    });
}

function sendConfigUpdateLog(guildId, executorTag, changes) {
    return sendLogToDashboard({
        guildId,
        title: `🔧 Configurações atualizadas`,
        description: `**Alterado por:** ${executorTag}`,
        type: 'config_updated',
        userName: executorTag,
        color: 0x3498DB,
        footer: 'Magnatas.gg • Configuração',
        fields: changes
            ? [{ name: 'Alterações', value: JSON.stringify(changes, null, 2).substring(0, 1024), inline: false }]
            : [],
    });
}

function sendMaintenanceLog(guildId, status, message) {
    const isStart = status === 'started';
    return sendLogToDashboard({
        guildId,
        title: isStart ? '🛠️ Manutenção iniciada' : '✅ Manutenção encerrada',
        description: message || (isStart ? 'O bot entrou em modo de manutenção.' : 'O bot saiu do modo de manutenção.'),
        type: isStart ? 'maintenance_started' : 'maintenance_ended',
        color: isStart ? 0xFF0000 : 0x2ECC71,
        footer: 'Magnatas.gg • Manutenção',
    });
}

function sendErrorLog(guildId, errorTitle, errorMessage) {
    return sendLogToDashboard({
        guildId,
        title: `❌ Erro: ${errorTitle}`,
        description: errorMessage,
        type: 'error',
        color: 0xFF0000,
        footer: 'Magnatas.gg • Erro',
    });
}

module.exports = {
    sendLogToDashboard,
    sendMemberJoinLog,
    sendMemberLeaveLog,
    sendBanLog,
    sendKickLog,
    sendClearLog,
    sendCommandLog,
    sendConfigUpdateLog,
    sendMaintenanceLog,
    sendErrorLog,
};
