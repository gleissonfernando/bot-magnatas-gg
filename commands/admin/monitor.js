const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// ─── Modelos opcionais — registrar aqui para garantir que existam ──────────────
const ServiceMetricSchema = new mongoose.Schema({
    service:   { type: String, required: true },
    status:    { type: String, default: 'Desconhecido' },
    latency:   { type: Number, default: null },
    createdAt: { type: Date, default: Date.now }
});
const MonitorConfigSchema = new mongoose.Schema({
    guildId:        { type: String, required: true, unique: true },
    alertChannelId: { type: String, default: null },
    enabled:        { type: Boolean, default: false },
    updatedBy:      { type: String, default: null }
});
const ServiceMetric = mongoose.models.ServiceMetric
    || mongoose.model('ServiceMetric', ServiceMetricSchema);
const MonitorConfig = mongoose.models.MonitorConfig
    || mongoose.model('MonitorConfig', MonitorConfigSchema);
// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('Gerencia o monitoramento do sistema Magnatas')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Mostra o status em tempo real de todos os serviços'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Envia um alerta de teste no canal configurado'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Mostra a configuração atual de monitoramento do servidor')),

    async execute(interaction) {
        const DEVELOPER_ID = '761011766440230932';
        const isDeveloper = interaction.user.id === DEVELOPER_ID;

        // Apenas Admins ou o Desenvolvedor Mestre podem usar
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !isDeveloper) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            await interaction.deferReply();
            
            try {
                const services = ['Dashboard', 'Bot', 'Database', 'Discord API', 'Verificador'];
                const embed = new EmbedBuilder()
                    .setTitle('📊 Status do Sistema Magnatas')
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setFooter({ text: 'Magnatas.gg • Monitoramento em Tempo Real' });

                for (const serviceName of services) {
                    let lastMetric = null;
                    try {
                        lastMetric = await ServiceMetric.findOne({ service: serviceName }).sort({ createdAt: -1 });
                    } catch (dbErr) {
                        // Banco não conectado ou modelo indisponível — continua com null
                    }
                    const statusEmoji = lastMetric?.status === 'Online' ? '🟢' : '🔴';
                    const latency = lastMetric?.latency ? `\`${lastMetric.latency}ms\`` : 'N/A';
                    embed.addFields({
                        name: `${statusEmoji} ${serviceName}`,
                        value: `Status: **${lastMetric?.status || 'Desconhecido'}**\nLatência: ${latency}`,
                        inline: true
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Erro ao buscar status:', error);
                await interaction.editReply('❌ Erro ao buscar o status dos serviços.');
            }
        }

        if (subcommand === 'config') {
            try {
                let config = null;
                try {
                    config = await MonitorConfig.findOne({ guildId: interaction.guildId });
                } catch (dbErr) {
                    // Banco não conectado — continua com null
                }

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Configuração de Monitoramento')
                    .setColor(0x00FFFF)
                    .addFields(
                        { name: 'Canal de Alerta', value: config?.alertChannelId ? `<#${config.alertChannelId}>` : '❌ Não configurado', inline: true },
                        { name: 'Sistema Ativo', value: config?.enabled ? '✅ Sim' : '❌ Não', inline: true },
                        { name: 'Última Alteração', value: config?.updatedBy || 'N/A', inline: false }
                    )
                    .setFooter({ text: 'Magnatas.gg • Configurações Técnicas' });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: '❌ Erro ao buscar configurações.', ephemeral: true });
            }
        }

        if (subcommand === 'test') {
            await interaction.deferReply({ ephemeral: true });
            try {
                let config = null;
                try {
                    config = await MonitorConfig.findOne({ guildId: interaction.guildId });
                } catch (dbErr) {
                    // Banco não conectado — continua com null
                }

                if (!config || !config.alertChannelId) {
                    return interaction.editReply('❌ Nenhum canal de alerta configurado para este servidor.');
                }

                const now = new Date().toLocaleString('pt-BR');
                const testEmbed = new EmbedBuilder()
                    .setTitle('🧪 TESTE DE MONITORAMENTO (VIA BOT)')
                    .setDescription(`**Status:** Comando executado com sucesso\n**Horário:** ${now}\n**Executado por:** ${interaction.user.tag}`)
                    .setColor(0x00FFFF)
                    .setFooter({ text: 'Magnatas.gg • Teste de Sistema' })
                    .setTimestamp();

                const channel = await interaction.guild.channels.fetch(config.alertChannelId).catch(() => null);
                if (channel) {
                    await channel.send({ embeds: [testEmbed] });
                    await interaction.editReply(`✅ Alerta de teste enviado em <#${config.alertChannelId}>!`);
                } else {
                    await interaction.editReply('❌ Não foi possível encontrar o canal configurado.');
                }
            } catch (error) {
                await interaction.editReply(`❌ Erro ao enviar teste: ${error.message}`);
            }
        }
    },
};
