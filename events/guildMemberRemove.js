const { Events, EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const discordLogger = require('../utils/discordLogger');
const { getGuildConfig, processMessageVariables } = require('../utils/configManager');
const { logMemberLeave } = require('../utils/guildLogger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const guild = member.guild;
            logger.info(`Membro saiu: ${member.user.username} do servidor ${guild.name}`);

            // --- Despedida via DM (try/catch corretamente aninhado) ---
            try {
                const goodbyeEmbed = new EmbedBuilder()
                    .setTitle(`Sentiremos sua falta no ${guild.name}!`)
                    .setDescription(`Olá ${member.user.username}, vimos que você saiu do servidor. Esperamos que tenha tido uma boa experiência e que volte em breve!`)
                    .setColor(0xFF0000)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                await member.send({ embeds: [goodbyeEmbed] });
                logger.info(`Mensagem de despedida enviada para a DM de ${member.user.tag}`);
            } catch (dmError) {
                logger.warn(`Não foi possível enviar DM de despedida para ${member.user.tag}: ${dmError.message}`);
            }
            // --------------------------------

            // Enviar log de saída para o canal de logs
            await discordLogger.logLeave(member);

            // 1. Buscar configurações do servidor
            const config = await getGuildConfig(guild.id);

            // 2. Verificar se o bot está ativado
            if (!config.botEnabled) {
                logger.warn(`Bot desativado em ${guild.name}`);
                return;
            }

            // 3. Verificar se há canal de saída
            if (!config.leaveChannelId) {
                logger.warn(`Canal de saída não configurado em ${guild.name}`);
                return;
            }

            // 4. Buscar o canal
            let channel;
            try {
                channel = guild.channels.cache.get(config.leaveChannelId) ||
                          await guild.channels.fetch(config.leaveChannelId);
            } catch (error) {
                logger.error(`Canal de saída não encontrado em ${guild.name}:`, error.message);
                return;
            }

            if (!channel) {
                logger.error(`Canal de saída inválido em ${guild.name}`);
                return;
            }

            // 5. Verificar permissões do bot
            if (!channel.permissionsFor(guild.members.me).has('SendMessages')) {
                logger.error(`Bot sem permissão para enviar mensagens em ${channel.name}`);
                return;
            }

            // 6. Processar mensagem de saída
            const leaveMessage = processMessageVariables(
                config.leaveMessage,
                member.user,
                guild
            );

            // 7. Criar embed de saída
            const embed = new EmbedBuilder()
                .setTitle(`🚪 Saída do ${guild.name}!`)
                .setDescription(leaveMessage)
                .setColor(0xff0000)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Usuário', value: member.user.username, inline: true },
                    { name: 'ID', value: member.id, inline: true },
                    { name: 'Membros Totais', value: guild.memberCount.toString(), inline: true }
                )
                .setFooter({ text: `Magnatas.gg • ${new Date().toLocaleDateString('pt-BR')}` })
                .setTimestamp();

            // 8. Enviar mensagem
            await channel.send({ embeds: [embed] });
            logger.info(`Mensagem de saída enviada para ${member.user.username} em ${guild.name}`);

            // 9. Registrar no log do servidor
            try {
                await logMemberLeave(guild, member);
            } catch (logError) {
                logger.error(`Erro ao registrar log de saída:`, logError.message);
            }

        } catch (error) {
            logger.error('Erro no evento guildMemberRemove:', error);
        }
    },
};
