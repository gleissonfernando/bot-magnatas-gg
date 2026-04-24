const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { handleCallInteraction, handleModal, handleVoiceStateUpdate } = require('./config/callManager');

// Importar o backend Express para registrar o cliente Discord
try {
    require('./backend/index.js');
} catch (e) {
    console.warn('[Bot] Backend não está rodando em paralelo.');
}

// Initialize Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();

// Load Commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Register Slash Commands
const registerCommands = async () => {
    const commandsData = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log('⏳ Registering slash commands...');
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
        console.log('✅ Global commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
};

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    try {
        const panelController = require('./backend/controllers/panel.controller');
        panelController.setDiscordClient(client);
    } catch (e) {
        console.error('[Bot] Erro ao registrar cliente no controlador:', e);
    }
    await registerCommands();
});

// Handle Interactions
client.on('interactionCreate', async interaction => {
    const mongoose = require('mongoose');
    const DEVELOPER_ID = process.env.DEVELOPER_ID || '761011766440230932';
    const isDeveloper = interaction.user.id === DEVELOPER_ID;

    // 1. Buscar Configurações Globais e Locais
    let globalConfig = null;
    let guildConfig = null;
    try {
        const GlobalConfig = mongoose.models.GlobalConfig;
        const GuildConfig = mongoose.models.GuildConfig;
        
        if (GlobalConfig) globalConfig = await GlobalConfig.findOne();
        if (GuildConfig) guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    } catch (e) {
        console.error('Erro ao buscar configurações:', e);
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
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Erro na execução do comando:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocorreu um erro interno!', ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ Ocorreu um erro interno!', ephemeral: true }).catch(() => {});
            }
        }
    } else if (interaction.isButton()) {
        await handleCallInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState, client);
});

client.login(config.token).catch(err => {
    console.error('❌ Erro ao logar o bot:', err);
});

module.exports = client;
