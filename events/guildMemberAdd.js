const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Buscar o canal de boas-vindas configurado
            const channel = member.guild.channels.cache.get(config.welcomeChannelId);

            if (!channel) {
                console.error(`❌ Canal de boas-vindas não encontrado: ${config.welcomeChannelId}`);
                return;
            }

            // Criar Embed Moderno
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🌌 Bem-vindo(a) ao cla Magnatas.gg - 1v99')
                .setDescription(`Olá ${member}, seja bem-vindo(a) ao cla.`)
                .setColor(0x2B2D31)
                .addFields(
                    {
                        name: '🔹 Informações iniciais',
                        value: 'Leia as regras e os avisos para entender o funcionamento do cla.',
                        inline: false
                    }
                )
                .setImage(config.bannerUrl) // Imagem dinâmica via config
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 })) // Avatar do usuário
                .setFooter({
                    text: 'Sistemas Magnatas.gg | Onde os melhores se encontram',
                    iconURL: member.guild.iconURL()
                })
                .setTimestamp();

            // Enviar mensagem
            await channel.send({
                content: `Welcome ${member}!`,
                embeds: [welcomeEmbed]
            });

        } catch (error) {
            console.error('❌ Erro no evento de boas-vindas:', error);
        }
    },
};
