const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const mongoose = require('mongoose');
            const WelcomeMessage = mongoose.models.WelcomeMessage;
            
            let welcomeData = null;
            if (WelcomeMessage) {
                welcomeData = await WelcomeMessage.findOne({ guildId: member.guild.id });
            }

            // Verificar se o sistema está ativo
            const isEnabled = welcomeData ? welcomeData.goodbyeEnabled : true;
            if (!isEnabled) return;

            // Definir Canal (Usa o de saída ou o de entrada como fallback)
            const channelId = (welcomeData && welcomeData.goodbyeChannelId) || config.goodbyeChannelId || config.welcomeChannelId;
            const channel = member.guild.channels.cache.get(channelId);
            if (!channel) return;

            // Processar Variáveis
            let messageStr = (welcomeData && welcomeData.goodbyeMessage) || '{user} saiu do cla. Esperamos que volte em breve!';
            messageStr = messageStr
                .replace('{user}', `${member.user.tag}`)
                .replace('{username}', member.user.username)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);

            // Imagem (Banner)
            const bannerUrl = (welcomeData && welcomeData.goodbyeBanner) || config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png';

            // Criar Embed Modelo Magnatas
            const goodbyeEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Saída do cla Magnatas.gg`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(messageStr)
                .setColor(0x2B2D31)
                .addFields(
                    {
                        name: '📉 Status do Cla',
                        value: `Agora somos apenas ${member.guild.memberCount} membros.`,
                        inline: false
                    }
                )
                .setImage(bannerUrl)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setTimestamp();

            await channel.send({ embeds: [goodbyeEmbed] });

        } catch (error) {
            console.error('❌ Erro no evento de despedida:', error);
        }
    },
};
