const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { handleCallInteraction, handleModal, handleVoiceStateUpdate } = require('./config/callManager');
const { logger } = require('./utils/logger');
const discordLogger = require('./utils/discordLogger');
const socketService = require('./utils/socketService');
const { createErrorEmbed } = require('./utils/messageUtils');

// Importar o backend Express para registrar o cliente Discord
try {
    require('./backend/index.js');
} catch (e) {
    logger.warn('Backend não está rodando em paralelo.');
}

// Initialize Client
// Gateway Intents necessários para todas as funcionalidades do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // 1 << 0 - Gerenciamento de servidores
        GatewayIntentBits.GuildMembers,        // 1 << 1 - Rastreamento de membros (Privilegiado)
        GatewayIntentBits.GuildMessages,       // 1 << 9 - Processamento de mensagens
        GatewayIntentBits.MessageContent,      // 1 << 15 - Acesso ao conteúdo (Privilegiado)
        GatewayIntentBits.DirectMessages,      // 1 << 12 - Suporte a DMs
        GatewayIntentBits.GuildVoiceStates     // 1 << 7 - Necessário para o sistema de calls temporárias
    ]
});

client.commands = new Collection();

// Load Commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

let commandCount = 0;
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commandCount++;
            }
        } catch (error) {
            logger.warn(`Erro ao carregar comando: ${file}`, { error: error.message });
        }
    }
}
logger.info(`${commandCount} comandos carregados com sucesso`);

// Load Events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    let eventCount = 0;
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            eventCount++;
        } catch (error) {
            logger.warn(`Erro ao carregar evento: ${file}`, { error: error.message });
        }
    }
    logger.info(`${eventCount} eventos carregados com sucesso`);
}

// Register Slash Commands
const registerCommands = async () => {
    const commandsData = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        logger.info(`Registrando ${commandsData.length} slash commands...`);
        if (config.guildId) {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commandsData },
            );
        }
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandsData },
        );
        logger.info('Comandos registrados com sucesso!');
    } catch (error) {
        logger.error('Erro ao registrar comandos', error);
    }
};

client.once('ready', async () => {
    logger.info(`Bot conectado como ${client.user.tag}`);
    discordLogger.setClient(client);
    try {
        const panelController = require('./backend/controllers/panel.controller');
        panelController.setDiscordClient(client);
    } catch (e) {
        logger.error('Erro ao registrar cliente no controlador', e);
    }
    await registerCommands();
    
    await discordLogger.sendLog({
        title: '🚀 Bot Online',
        description: 'O bot foi iniciado e está pronto para uso.',
        color: 0x00FF00
    });

    // Inicializar conexão em tempo real com o painel
    socketService.init(client);

    // Alerta no privado do desenvolvedor
    const developerId = config.developerId || process.env.DEVELOPER_ID;
    if (developerId) {
        try {
            const developer = await client.users.fetch(developerId);
            if (developer) {
                const restartEmbed = new EmbedBuilder()
                    .setTitle('🔄 Bot Inicializado/Reiniciado')
                    .setDescription(`O bot **${client.user.tag}** foi iniciado com sucesso e está online.`)
                    .setColor(0x00FF00)
                    .setTimestamp();
                
                await developer.send({ embeds: [restartEmbed] });
                logger.info(`Alerta de inicialização enviado para o desenvolvedor: ${developer.tag}`);
            }
        } catch (err) {
            logger.error('Erro ao enviar alerta de inicialização no privado', err);
        }
    }
});

// Handle Interactions
client.on('interactionCreate', async interaction => {
    const mongoose = require('mongoose');
    const DEVELOPER_ID = process.env.DEVELOPER_ID || '761011766440230932';
    const isDeveloper = interaction.user.id === DEVELOPER_ID;
    
    // Detecção de Dono do Servidor
    const isServerOwner = interaction.guild?.ownerId === interaction.user.id;
    
    if (isServerOwner) {
        logger.info(`Dono do servidor detectado: ${interaction.user.tag} no servidor ${interaction.guild?.name}`);
    }

    try {
        // 1. Buscar Configurações Globais e Locais
        let globalConfig = null;
        let guildConfig = null;
        try {
            const GlobalConfig = mongoose.models.GlobalConfig;
            const GuildConfig = mongoose.models.GuildConfig;
            
            if (GlobalConfig) globalConfig = await GlobalConfig.findOne();
            if (GuildConfig) guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
        } catch (e) {
            logger.error('Erro ao buscar configurações', e, { guildId: interaction.guildId });
        }

        // 2. Verificar Manutenção (Global tem prioridade)
        const isGlobalMaintenance = globalConfig && globalConfig.maintenanceGlobalEnabled;
        const isLocalMaintenance = guildConfig && guildConfig.maintenanceEnabled;

        if ((isGlobalMaintenance || isLocalMaintenance) && !isDeveloper) {
            const config = isGlobalMaintenance ? globalConfig : guildConfig;
            const maintenanceEmbed = new EmbedBuilder()
                .setTitle('🛠️ Bot em manutenção')
                .setDescription(config.maintenanceMessage || '⚠️ O bot está em manutenção. Aguarde, já voltamos.')
                .setColor(0xFF0000)
                .setFooter({ text: 'Magnatas.gg • Sistema de manutenção' })
                .setTimestamp();

            const mediaUrl = isGlobalMaintenance ? globalConfig.maintenanceVideoUrl : guildConfig.maintenanceVideoUrl;
            if (mediaUrl) {
                maintenanceEmbed.setImage(mediaUrl);
            }

            if (interaction.isRepliable()) {
                return interaction.reply({ embeds: [maintenanceEmbed], ephemeral: true }).catch(() => {});
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logger.warn('Comando não encontrado', { 
                    commandName: interaction.commandName,
                    userId: interaction.user.id 
                });
                return;
            }
            try {
                logger.command(interaction.commandName, interaction.user.id, interaction.guildId);
                await discordLogger.logCommand(interaction);
                await command.execute(interaction);
            } catch (error) {
                await discordLogger.logSystemError(`Erro ao executar comando /${interaction.commandName}`, error);
                logger.commandError(interaction.commandName, error, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
                
                const errorEmbed = createErrorEmbed(
                    'Erro na Execução',
                    'Ocorreu um erro interno ao processar seu comando. Tente novamente mais tarde.'
                );
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                }
            }
        } else if (interaction.isButton()) {
            try {
                logger.interaction('button', interaction.user.id, interaction.guildId, { customId: interaction.customId });
                await handleCallInteraction(interaction);
            } catch (error) {
                logger.error('Erro ao processar botão', error, { 
                    customId: interaction.customId,
                    userId: interaction.user.id 
                });
            }
        } else if (interaction.isModalSubmit()) {
            try {
                logger.interaction('modal', interaction.user.id, interaction.guildId, { customId: interaction.customId });
                await handleModal(interaction);
            } catch (error) {
                logger.error('Erro ao processar modal', error, { 
                    customId: interaction.customId,
                    userId: interaction.user.id 
                });
            }
        }
    } catch (error) {
        logger.error('Erro geral ao processar interação', error, {
            userId: interaction.user?.id,
            guildId: interaction.guildId
        });
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        handleVoiceStateUpdate(oldState, newState, client);
    } catch (error) {
        logger.error('Erro ao processar voice state update', error);
    }
});

client.login(config.token).catch(err => {
    logger.critical('Erro ao logar o bot', err);
    process.exit(1);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rejeitada não tratada', new Error(String(reason)), { promise: String(promise) });
});

process.on('uncaughtException', async (error) => {
    await logger.critical('Exceção não capturada', error);
    process.exit(1);
});

// Captura de sinais de desligamento
const handleShutdown = async (signal) => {
    logger.info(`Sinal de desligamento recebido: ${signal}`);
    
    const developerId = config.developerId || process.env.DEVELOPER_ID;
    if (client && client.isReady()) {
        try {
            // 1. Alerta no canal de logs
            await discordLogger.sendLog({
                title: '🛑 Bot Desligando',
                description: `O bot está sendo desligado (Sinal: ${signal}).`,
                color: 0xFFA500
            });

            // 2. Alerta na DM do desenvolvedor
            if (developerId) {
                const developer = await client.users.fetch(developerId);
                if (developer) {
                    const shutdownEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Alerta de Desligamento')
                        .setDescription(`O bot **${client.user.tag}** recebeu um sinal de desligamento: \`${signal}\`.`)
                        .setColor(0xFFA500)
                        .setTimestamp();
                    
                    await developer.send({ embeds: [shutdownEmbed] });
                }
            }
        } catch (err) {
            logger.error('Erro ao enviar alertas de desligamento', err);
        }
    }
    
    // Pequeno delay para garantir o envio das mensagens
    setTimeout(() => {
        process.exit(0);
    }, 2000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Limpeza de logs antigos a cada 24 horas
setInterval(() => {
    logger.cleanOldLogs(7);
}, 24 * 60 * 60 * 1000);

module.exports = client;
