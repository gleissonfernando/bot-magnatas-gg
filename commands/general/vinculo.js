const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vinculo')
        .setDescription('Vincula seu ID do Discord ao sistema de sincronização')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que você deseja vincular (deixe vazio para você mesmo)')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // Vermelho Magnatas
            .setTitle('🔗 Sincronização de Vínculo')
            .setDescription(`O ID do Discord para **${targetUser.tag}** foi identificado.`)
            .addFields(
                { name: '👤 Usuário', value: `<@${targetUser.id}>`, inline: true },
                { name: '🆔 Discord ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '📊 Status', value: 'Pronto para sincronização Steam Hex', inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: 'Magnatas.gg • Sistema de Vínculo', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
