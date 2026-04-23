const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelverificar')
        .setDescription('Envia o painel de verificação profissional do magnatas.gg')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // --- Configurações de Design ---
        const EMBED_COLOR = 0x2B2D31; // Preto/Azulado Profissional
        const BANNER_URL = config.bannerUrl || 'https://via.placeholder.com/1200x400?text=Magnatas.gg+Verification';
        const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${config.oauth2.clientId}&redirect_uri=${encodeURIComponent(config.oauth2.redirectUri)}&response_type=code&scope=bot%20email%20gdm.join`;

        // --- Construção do Embed ---
        const embed = new EmbedBuilder()
            .setTitle('🌌 Central de Verificação - magnatas.gg')
            .setDescription('Bem-vindo ao servidor! Para liberar seu acesso total, você precisa conectar sua conta do Discord em nosso painel oficial.\n\n**Passos para verificação:**\n1️⃣ Clique no botão abaixo\n2️⃣ Autorize o acesso via OAuth2\n3️⃣ Aguarde a atribuição automática do cargo')
            .setColor(EMBED_COLOR)
            .addFields(
                {
                    name: '🔍 O que vai acontecer?',
                    value: '• O sistema irá buscar discords antigos\n• O sistema sincroniza seu nick\n• O sistema adiciona cargos automaticamente',
                    inline: false
                },
                {
                    name: '📋 Passo a Passo',
                    value: '1️⃣ Clique no botão abaixo\n2️⃣ Autorize o login\n3️⃣ Aguarde a validação\n4️⃣ Retorne com o cargo',
                    inline: false
                }
            )
            .setImage(BANNER_URL)
            .setFooter({
                text: '🔒 Segurança Magnatas.gg | Verificação Instantânea',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // --- Construção do Botão ---
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Conectar com Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(OAUTH_URL)
        );

        // --- Envio ---
        try {
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({ content: '✅ Painel de verificação enviado com sucesso!' });
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Erro ao enviar painel:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ Ocorreu um erro ao tentar enviar o painel.' });
            } else {
                await interaction.reply({ content: '❌ Ocorreu um erro ao tentar enviar o painel.', ephemeral: true }).catch(() => {});
            }
        }
    },
};
