const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const { TOKEN } = require("../config.json")
const { default_url, GP_URL } = require("../logosB64.json")

client.commands = getCommands('./commands');
client.token = TOKEN;

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {

            let command = client.commands.get(interaction.commandName, false);

            try {
                if (interaction.replied) return;
                command.execute(interaction);
            } catch (error) {
                console.error(error);
            }
        }
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
    }
}

async function handleModalSubmit(interaction) {
    switch (interaction.customId) {
        //modal response from the admin command "addEvent"
        case "addEventModal":
            addEventModal(interaction);
            break;
        default:
            interaction.reply({ content: 'default modal response' });
    }

}


async function addEventModal(interaction) {
    const fieldInput = interaction.fields.getTextInputValue('linkInput');
    const d = new Date()
    const oneDay = 86400;
    const eventStart = new Date('05 October 2023 14:48 UTC').toISOString();
    const eventEnd = new Date('06 October 2023 14:48 UTC').toISOString();
    const guild = interaction.guild;

    await guild.scheduledEvents.create({name: fieldInput, scheduledStartTime: eventStart, scheduledEndTime: eventEnd, privacyLevel: 2, 
                                        entityType: 3, description: "test desc", entityMetadata: { location: "discord" }, 
                                        image: default_url}); 
    

    await interaction.reply({ content: 'Your submission was received successfully!' })
}

function getCommands(dir) {
    let commands = new Collection();
    const commandFiles = getFiles(dir);

    for (const commandFile of commandFiles) {
        const command = require("." + commandFile)
        commands.set(command.data.toJSON().name, command);
    }
    return commands;
}

function getFiles(dir) {
    const files = fs.readdirSync(dir, {
        withFileTypes: true
    });
    let commandFiles = [];

    for (const file of files) {
        if (file.isDirectory()) {
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