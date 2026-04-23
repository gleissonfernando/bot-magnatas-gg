const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelboasvindas')
        .setDescription('Envia o painel de boas-vindas oficial do magnatas.gg')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const mongoose = require('mongoose');
            const WelcomeMessage = mongoose.models.WelcomeMessage;
            
            let welcomeData = null;
            if (WelcomeMessage) {
                welcomeData = await WelcomeMessage.findOne({ guildId: interaction.guildId });
            }

            const bannerUrl = (welcomeData && welcomeData.welcomeBanner) || config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png';
            const messageStr = (welcomeData && welcomeData.welcomeMessage) || 'Seja bem-vindo(a) ao cla Magnatas.gg!';

            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Bem-vindo(a) ao cla Magnatas.gg - 1v99`, 
                    iconURL: interaction.guild.iconURL() 
                })
                .setDescription(messageStr.replace('{user}', `${interaction.user}`))
                .setColor(0x2B2D31)
                .addFields(
                    {
                        name: 'ℹ️ Informacoes iniciais',
                        value: 'Leia as regras e os avisos para entender o funcionamento do cla.',
                        inline: false
                    }
                )
                .setImage(bannerUrl)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ content: '✅ Painel de boas-vindas enviado!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao enviar painel de boas-vindas:', error);
            await interaction.reply({ content: '❌ Erro ao enviar o painel.', ephemeral: true }).catch(() => {});
        }
    },
};
