const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const mongoose = require('mongoose');
            const WelcomeMessage = mongoose.models.WelcomeMessage;
            
            let welcomeData = null;
            if (WelcomeMessage) {
                welcomeData = await WelcomeMessage.findOne({ guildId: member.guild.id });
            }

            // Verificar se o sistema está ativo (Dashboard ou Config)
            const isEnabled = welcomeData ? welcomeData.welcomeEnabled : true;
            if (!isEnabled) return;

            // Definir Canal
            const channelId = (welcomeData && welcomeData.welcomeChannelId) || config.welcomeChannelId;
            const channel = member.guild.channels.cache.get(channelId);
            if (!channel) return;

            // Processar Variáveis na Mensagem
            let messageStr = (welcomeData && welcomeData.welcomeMessage) || '{user}, seja bem-vindo(a) ao cla.';
            messageStr = messageStr
                .replace('{user}', `${member}`)
                .replace('{username}', member.user.username)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);

            // Imagem (Banner)
            const bannerUrl = (welcomeData && welcomeData.welcomeBanner) || config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png';

            // Criar Embed Modelo Magnatas
            const welcomeEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Bem-vindo(a) ao cla Magnatas.gg - 1v99`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(messageStr)
                .setColor(0x2B2D31)
                .addFields(
                    {
                        name: 'ℹ️ Informacoes iniciais',
                        value: 'Leia as regras e os avisos para entender o funcionamento do cla.',
                        inline: false
                    }
                )
                .setImage(bannerUrl)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setTimestamp();

            await channel.send({ embeds: [welcomeEmbed] });

        } catch (error) {
            console.error('❌ Erro no evento de boas-vindas:', error);
        }
    },
};
