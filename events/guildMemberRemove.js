const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // Buscar o canal de saída configurado
            const channel = member.guild.channels.cache.get(config.goodbyeChannelId);

            if (!channel) {
                console.error(`❌ Canal de saída não encontrado: ${config.goodbyeChannelId}`);
                return;
            }

            // Criar Embed Moderno de Saída
            const goodbyeEmbed = new EmbedBuilder()
                .setTitle('🔴 Saiu do servidor magnatas.gg')
                .setDescription(`**${member.user.tag}**\nO usuário saiu do clã.`)
                .setColor(0x2F2F2F) // Cinza Escuro/Preto
                .addFields(
                    {
                        name: '🔹 Informações',
                        value: 'A vaga foi liberada e esperamos ver você novamente.',
                        inline: false
                    }
                )
                .setImage(config.bannerUrl) // Banner dinâmico via config
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 })) // Avatar do usuário
                .setFooter({
                    text: 'Sistemas Magnatas.gg | Até breve!',
                    iconURL: member.guild.iconURL()
                })
                .setTimestamp();

            // Enviar mensagem
            await channel.send({
                embeds: [goodbyeEmbed]
            });

        } catch (error) {
            console.error('❌ Erro no evento de saída:', error);
        }
    },
};
