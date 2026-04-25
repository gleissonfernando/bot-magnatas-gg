const { EmbedBuilder } = require('discord.js');
const { logger } = require('./logger');

let discordClient = null;
const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID || '1484488135508234395';

/**
 * Define o cliente do Discord para o logger
 */
function setClient(client) {
    discordClient = client;
}

/**
 * Retorna o cliente do Discord
 */
function getClient() {
    return discordClient;
}

/**
 * Envia um log para o canal do Discord
 */
async function sendLog(options) {
    if (!discordClient) return;

    try {
        const channel = await discordClient.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const {
            title = 'Log do Sistema',
            description = '',
            color = 0x5865F2,
            fields = [],
            thumbnail = null,
            footer = 'Magnatas.gg • Logs'
        } = options;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: footer })
            .setTimestamp();

        if (fields.length > 0) embed.addFields(fields);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Erro ao enviar log para o Discord:', error);
    }
}

/**
 * Log de comando executado
 */
async function logCommand(interaction) {
    await sendLog({
        title: '💻 Comando Executado',
        description: `O usuário **${interaction.user.tag}** executou um comando.`,
        color: 0x3498DB,
        fields: [
            { name: 'Comando', value: `\`/${interaction.commandName}\``, inline: true },
            { name: 'Usuário', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
            { name: 'Canal', value: `<#${interaction.channelId}>`, inline: true }
        ]
    });
}

/**
 * Log de entrada de membro
 */
async function logJoin(member) {
    await sendLog({
        title: '📥 Novo Membro',
        description: `**${member.user.tag}** entrou no servidor.`,
        color: 0x2ECC71,
        thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        fields: [
            { name: 'Usuário', value: `${member.user.tag}`, inline: true },
            { name: 'ID', value: `\`${member.id}\``, inline: true },
            { name: 'Conta Criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        ]
    });
}

/**
 * Log de saída de membro
 */
async function logLeave(member) {
    await sendLog({
        title: '📤 Membro Saiu',
        description: `**${member.user.tag}** saiu do servidor.`,
        color: 0xFF6B6B,
        thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        fields: [
            { name: 'Usuário', value: `${member.user.tag}`, inline: true },
            { name: 'ID', value: `\`${member.id}\``, inline: true }
        ]
    });
}

/**
 * Log de erro do sistema
 */
async function logSystemError(message, error) {
    await sendLog({
        title: '❌ Erro do Sistema',
        description: message,
        color: 0xFF0000,
        fields: [
            { name: 'Erro', value: `\`\`\`${error?.message || error || 'Erro desconhecido'}\`\`\``, inline: false }
        ]
    });
}

module.exports = {
    setClient,
    sendLog,
    logCommand,
    logJoin,
    logLeave,
    logSystemError
};
