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
    let startedLinks = []

    const eventManager = interaction.guild.scheduledEvents
    let eventCollection = await eventManager.fetch();

    for (let i = 0; i < linkArr.length; i++) {
        let eventStarted = false;
        if (!scrapper.checkValidURL(linkArr[i])) {
            failedLinks.push(linkArr[i])
        }
        else {
            let pageInfo = await scrapper.scrapeSingleEvent(linkArr[i])
            if (!pageInfo) {
                failedLinks.push(linkArr[i])
                continue;
            }
            else {
                const currentDate = new Date();
                //console.log("current date:", currentDate)
                //console.log('event start time', pageInfo.scheduledStartTime)
                if (pageInfo.scheduledStartTime.getTime() < currentDate.getTime()) {
                    //console.log('event started already')
                    startedLinks.push(linkArr[i])
                    eventStarted = true;
                    continue;
                }
                let existingEvent = await eventCollection.find(scheduledEvent => scheduledEvent.name === pageInfo.name)
                if (existingEvent && existingEvent.creator.bot) {
                    /*The following checks if anything is different before making a api request
                     Image from page info will always be different in this case though :\ 
                    let editArgObj = {}
                     if (existingEvent.scheduledStartTime.getTime() !== infoPage.scheduledStartTime.getTime()) editArgObj[scheduledStartTime] = pageInfo.scheduledStartTime
                     if (existingEvent.scheduledEndTime.getTime() !== infoPage.scheduledEndTime.getTime()) editArgObj[scheduledEndTime] = pageInfo.scheduledEndTime
                     if (existingEvent.entityMetadata.location !== pageInfo.location) editArgObj[entityMetadata] = { location: pageInfo.location }
                     if (existingEvent.image) */

                    await existingEvent.edit({
                        scheduledStartTime: pageInfo.scheduledStartTime.toISOString(), scheduledEndTime: pageInfo.scheduledEndTime.toISOString(),
                        description: pageInfo.link, entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                    });
                    passedLinks.push(linkArr[i]);
                }
                else if (!eventStarted) {
                    const guild = interaction.guild;
                    await guild.scheduledEvents.create({
                        name: pageInfo.name, scheduledStartTime: pageInfo.scheduledStartTime.toISOString(), scheduledEndTime: pageInfo.scheduledEndTime.toISOString(),
                        privacyLevel: 2, entityType: 3, description: pageInfo.link, entityMetadata: { location: pageInfo.location },
                        image: pageInfo.coverImgB64
                    });
                    passedLinks.push(linkArr[i]);
                }
            }
        }
    }
    if (passedLinks.length != 0) {
        let reply = '**The following links were accepted:**'
        let failedLinkReply = '**The following provided links were invalid:**'
        let startedLinkReply = '**The Following provided links are for events that have already started**'
        for (let i = 0; i < passedLinks.length; i++) {
            reply += `\n${passedLinks[i]}`
        }
        await interaction.editReply({ content: reply })
        if (failedLinks.length != 0) {
            for (let i = 0; i < failedLinks.length; i++) {
                failedLinkReply += `\n${failedLinks[i]}`
            }
            await interaction.followUp({ content: failedLinkReply })
        }
        if (startedLinks.length != 0) {
            for (let i = 0; i < startedLinks.length; i++) {
                startedLinkReply += `\n${startedLinks[i]}`
            }
            await interaction.followUp({ content: startedLinkReply })
        }
    }
    else if (startedLinks != 0) {
        let failedLinkReply = '**The following provided links were invalid:**'
        let startedLinkReply = '**The Following provided links are for events that have already started**'
        for (let i = 0; i < startedLinks.length; i++) {
            startedLinkReply += `\n${startedLinks[i]}`
        }
        await interaction.editReply({ content: startedLinkReply })
        if (failedLinks.length != 0) {
            for (let i = 0; i < failedLinks.length; i++) {
                failedLinkReply += `\n${failedLinks[i]}`
            }
            await interaction.followUp({ content: failedLinkReply })
        }
    }
    else await interaction.followUp({ content: 'None of the provided links were valid' })


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