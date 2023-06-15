const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const { TOKEN } = require("../config.json")
const { Scrapper } = require('../scrapper/scrapper.js')
const { default_url, GP_URL } = require("../logosB64.json");
const { url } = require('node:inspector');

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
            addEventModals(interaction);
            break;
        default:
            interaction.reply({ content: 'default modal response' });
    }

}


async function addEventModals(interaction) {
    const scrapper = new Scrapper
    const fieldInput = interaction.fields.getTextInputValue('linkInput');
    const linkArr = fieldInput.split('\n')
    console.log("linkArr1:", linkArr)
    await interaction.deferReply()
    let passedLinks = []
    let failedLinks = []
    for (let i = 0; i < linkArr.length; i++) {
        if(!scrapper.checkValidURL(linkArr[i])) {
            failedLinks.push(linkArr[i])
        }
        else {
            let pageInfo = await scrapper.scrapeSingleEvent(linkArr[i])
            if (!pageInfo) {
                failedLinks.push(linkArr[i])
                continue;
            }
            else {
                //console.log("pageInfo:", pageInfo)
            const guild = interaction.guild;
            await guild.scheduledEvents.create({name: pageInfo.name, scheduledStartTime: pageInfo.scheduledStartTime, scheduledEndTime: pageInfo.scheduledEndTime,
                                                 privacyLevel: 2, entityType: 3, description: pageInfo.link, entityMetadata: { location: pageInfo.location }, 
                                                image: pageInfo.coverImgB64}); 
            
        
            passedLinks.push(linkArr[i]);
            }
        }
    }
    if (passedLinks.length != 0) {
        reply = '**The following links were accepted:**'
        followUp = '**The following provided links were invalid:**'
        for (let i = 0; i < passedLinks.length; i++) {
            reply += `\n${passedLinks[i]}`
        }
        await interaction.editReply({content: reply})
        if (failedLinks.length != 0) {
            for (let i = 0; i < failedLinks.length; i++) {
                followUp += `\n${failedLinks[i]}`
            }
            await interaction.followUp({content: followUp})
        }
    }
    else await interaction.editReply({content: "All of the provided links were not accepted!"})

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