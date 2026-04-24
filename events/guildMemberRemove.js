const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            logger.info(`Membro saiu: ${member.user.tag} (${member.id}) do servidor ${member.guild.name}`);

            const mongoose = require('mongoose');
            const WelcomeMessage = mongoose.models.WelcomeMessage;
            const GuildConfig = mongoose.models.GuildConfig;
            
            let welcomeData = null;
            if (WelcomeMessage) {
                welcomeData = await WelcomeMessage.findOne({ guildId: member.guild.id });
            }

            if (!welcomeData && GuildConfig) {
                welcomeData = await GuildConfig.findOne({ guildId: member.guild.id });
            }

            // Verificar se o sistema está ativo
            const isEnabled = welcomeData ? (welcomeData.goodbyeEnabled ?? true) : true;
            if (!isEnabled) {
                logger.debug(`Sistema de despedida desativado para o servidor ${member.guild.id}`);
                return;
            }

            // Definir Canal (Usa o de saída ou o de entrada como fallback)
            const channelId = (welcomeData && (welcomeData.goodbyeChannelId || welcomeData.goodbyeChannel)) || config.goodbyeChannelId || config.welcomeChannelId;
            
            if (!channelId) {
                logger.warn(`Canal de despedida não configurado para o servidor ${member.guild.id}`);
                return;
            }

            let channel = member.guild.channels.cache.get(channelId);
            if (!channel) {
                try {
                    channel = await member.guild.channels.fetch(channelId);
                } catch (e) {
                    logger.error(`Não foi possível encontrar o canal de despedida ${channelId} via fetch`, e);
                }
            }

            if (!channel) {
                logger.error(`Canal de despedida ${channelId} não encontrado no servidor ${member.guild.id}`);
                return;
            }

            // Processar Variáveis
            let messageStr = (welcomeData && welcomeData.goodbyeMessage) || '{username} saiu do clã. Esperamos que volte em breve!';
            messageStr = messageStr
                .replace(/{user}/g, `${member.user.tag}`)
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            // Imagem (Banner)
            const bannerUrl = (welcomeData && (welcomeData.goodbyeBanner || welcomeData.goodbyeBannerUrl)) || config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png';

            // Criar Embed Modelo Magnatas
            const goodbyeEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Saída do clã Magnatas.gg`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(messageStr)
                .setColor(0xFF0000) // Vermelho para saída
                .addFields(
                    {
                        name: '📉 Status do Clã',
                        value: `Agora somos ${member.guild.memberCount} membros.`,
                        inline: false
                    }
                )
                .setImage(bannerUrl)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setFooter({ text: 'Magnatas.gg • Sistema de Despedida' })
                .setTimestamp();

            await channel.send({ embeds: [goodbyeEmbed] });
            logger.info(`Mensagem de despedida enviada para ${member.user.tag}`);

        } catch (error) {
            logger.error('Erro no evento de despedida (guildMemberRemove)', error);
        }
    },
};
