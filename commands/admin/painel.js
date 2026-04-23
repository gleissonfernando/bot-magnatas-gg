const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel de verificação SkyFall (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Alterado: Agora o link redireciona DIRETAMENTE para o site de verificação
        const DIRECT_URL = 'https://discord-verification.shardweb.app';

        const embed = new EmbedBuilder()
            .setTitle('🌌 SkyFall - Central de Verificação')
            .setDescription('Bem-vindo ao servidor! Para liberar seu acesso total, você precisa conectar sua conta do Discord em nosso painel oficial.\n\n**Passos para verificação:**\n1️⃣ Clique no botão abaixo\n2️⃣ Siga as instruções no site\n3️⃣ Aguarde a atribuição automática do cargo')
            .setColor(0x2B2D31)
            .setImage(config.bannerUrl || 'https://via.placeholder.com/1200x400?text=SkyFall+Verification')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/124/124014.png')
            .setFooter({ text: 'Segurança SkyFall | Verificação Instantânea' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Verificar Conta')
                .setStyle(ButtonStyle.Link)
                .setURL(DIRECT_URL)
        );

        try {
            await interaction.reply({ content: '✅ Painel enviado com sucesso!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Erro ao enviar painel:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Erro ao enviar o painel.', ephemeral: true }).catch(() => {});
            }
        }
    },
};
