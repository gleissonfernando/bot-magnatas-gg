const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelcontrole')
        .setDescription('Envia o painel de controle rápido do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Painel de Controle - Magnatas.gg')
            .setDescription('Gerencie as funções do bot diretamente pelo Discord ou acesse o Dashboard completo.')
            .setColor(0x2B2D31)
            .addFields(
                { name: '🌐 Dashboard', value: '[Acesse o Painel Web](https://magnatas-dashboard.shardweb.app)', inline: true },
                { name: '🔧 Status', value: 'Bot Online & Operacional', inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Dashboard')
                .setStyle(ButtonStyle.Link)
                .setURL('https://magnatas-dashboard.shardweb.app'),
            new ButtonBuilder()
                .setCustomId('refresh_status')
                .setLabel('Atualizar Status')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );

        await interaction.reply({ content: '✅ Painel de controle enviado!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
