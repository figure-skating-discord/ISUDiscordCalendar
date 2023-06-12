const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const client = new Client({intents: [GatewayIntentBits.Guilds]});

client.commands = getCommands(path.join(__dirname, '../commands'));

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        let command = client.commands.get(interaction.commandName, false);

        try {
            if (interaction.replied) return;
            command.execute(interaction);
        } catch (error) {
            console.error(error);
        }
    }
}

function getCommands(dir) {
    let commands = new Collection();
    const commandFiles = getFiles(dir);

    for(const commandFile of commandFiles) {
        const command = require(commandFile)
        commands.set(command.data.toJSON().name, command);
    }
    return commands;
}

function getFiles(dir) {
    const files = fs.readdirSync(dir, {
        withFileTypes: true
    });
    let commandFiles = [];

    for(const file of files) {
        if(file.isDirectory()){
            commandFiles = [
                ...commandFiles,
                ...getFiles(`${dir}/${file.name}`)
            ]
        } else if (file.name.endsWith('.js')) {
            commandFiles.push(`${dir}/${file.name}`)
        }
    }
    return commandFiles;
}
