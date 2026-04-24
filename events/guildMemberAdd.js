const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const { logger } = require('../utils/logger');
const { createSuccessEmbed } = require('../utils/messageUtils');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            logger.info(`Novo membro entrou: ${member.user.tag} (${member.id}) no servidor ${member.guild.name}`);

            const mongoose = require('mongoose');
            // Tenta buscar em WelcomeMessage ou GuildConfig (dependendo de como o dashboard salva)
            const WelcomeMessage = mongoose.models.WelcomeMessage;
            const GuildConfig = mongoose.models.GuildConfig;
            
            let welcomeData = null;
            if (WelcomeMessage) {
                welcomeData = await WelcomeMessage.findOne({ guildId: member.guild.id });
            }
            
            // Fallback para GuildConfig se WelcomeMessage não tiver os dados
            if (!welcomeData && GuildConfig) {
                welcomeData = await GuildConfig.findOne({ guildId: member.guild.id });
            }

            // Verificar se o sistema está ativo (Padrão: Ativo se não houver config)
            const isEnabled = welcomeData ? (welcomeData.welcomeEnabled ?? true) : true;
            if (!isEnabled) {
                logger.debug(`Sistema de boas-vindas desativado para o servidor ${member.guild.id}`);
                return;
            }

            // Definir Canal
            const channelId = (welcomeData && (welcomeData.welcomeChannelId || welcomeData.welcomeChannel)) || config.welcomeChannelId;
            
            if (!channelId) {
                logger.warn(`Canal de boas-vindas não configurado para o servidor ${member.guild.id}`);
                return;
            }

            // Tenta buscar o canal (fetch se não estiver no cache)
            let channel = member.guild.channels.cache.get(channelId);
            if (!channel) {
                try {
                    channel = await member.guild.channels.fetch(channelId);
                } catch (e) {
                    logger.error(`Não foi possível encontrar o canal ${channelId} via fetch`, e);
                }
            }

            if (!channel) {
                logger.error(`Canal de boas-vindas ${channelId} não encontrado no servidor ${member.guild.id}`);
                return;
            }

            // Processar Variáveis na Mensagem
            let messageStr = (welcomeData && welcomeData.welcomeMessage) || '{user}, seja bem-vindo(a) ao clã Magnatas.gg!';
            messageStr = messageStr
                .replace(/{user}/g, `${member}`)
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            // Imagem (Banner)
            const bannerUrl = (welcomeData && (welcomeData.welcomeBanner || welcomeData.welcomeBannerUrl)) || config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png';

            // Criar Embed usando utilitários para consistência
            const welcomeEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Bem-vindo(a) ao clã Magnatas.gg`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(messageStr)
                .setColor(0x00FF00) // Verde Magnatas
                .addFields(
                    {
                        name: 'ℹ️ Informações iniciais',
                        value: 'Leia as regras e os avisos para entender o funcionamento do clã.',
                        inline: false
                    },
                    {
                        name: '📊 Membros',
                        value: `Você é o membro nº ${member.guild.memberCount}`,
                        inline: true
                    }
                )
                .setImage(bannerUrl)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setFooter({ text: 'Magnatas.gg • Sistema de Boas-vindas' })
                .setTimestamp();

            await channel.send({ content: `👋 ${member}`, embeds: [welcomeEmbed] });
            logger.info(`Mensagem de boas-vindas enviada para ${member.user.tag}`);

        } catch (error) {
            logger.error('Erro no evento de boas-vindas (guildMemberAdd)', error);
        }
    },
};
