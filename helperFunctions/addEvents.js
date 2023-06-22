const { Scrapper } = require('../scrapper/scrapper.js')
const { loadingBar } = require('./loadingBar.js');

async function addEvents(interaction, linkArr=undefined) {

    //await interaction.deferReply()
    let numEventsProcessed = 0;

    const scrapper = new Scrapper
    if (!linkArr) {
        let fieldInput = interaction.fields.getTextInputValue('linkInput');
        linkArr = fieldInput.split('\n')
    }

    const progress = await interaction.followUp({content: `Number of events processed: ${numEventsProcessed}/${linkArr.length}`})

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
                const currentDate = new Date;
                if (pageInfo.scheduledStartTime.getTime() < currentDate.getTime()) {
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
                        scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(), scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                        description: pageInfo.link, entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                    });
                    passedLinks.push(linkArr[i]);
                }
                else if (!eventStarted) {
                    const guild = interaction.guild;
                    await guild.scheduledEvents.create({
                        name: pageInfo.name, scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(), scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                        privacyLevel: 2, entityType: 3, description: pageInfo.link, entityMetadata: { location: pageInfo.location },
                        image: pageInfo.coverImgB64
                    });
                    passedLinks.push(linkArr[i]);
                }
            }
        }
        numEventsProcessed++;
        console.log(`Number of events processed: ${numEventsProcessed}/${linkArr.length}`);
        progress.edit({content: `Number of events processed: ${numEventsProcessed}/${linkArr.length}
                    \n${loadingBar(numEventsProcessed, linkArr.length)}`})
    }
    if (passedLinks.length != 0) {
        let reply = ['**The following links were accepted:**']
        let failedLinkReply = ['**The following provided links were invalid:**']
        let startedLinkReply = ['**The Following provided links are for events that have already started**']
        for (let i = 0; i < passedLinks.length; i++) {
            if (reply[-0].length + passedLinks[i] >= 2000) reply.push(passedLinks[i]);
            else reply[-0] += `\n${passedLinks[i]}`
        }
        await interaction.editReply({ content: reply[0], components: [], embeds: []})
        if (reply[1]) {
            for (let i = 1; i < reply.length; i++) {
                await interaction.followUp({ content: reply[i] })
            }
        }
        if (failedLinks.length != 0) {
            for (let i = 0; i < failedLinks.length; i++) {
                if (failedLinkReply[-0].length + failedLinks[i] >= 2000) reply.push(failedLinks[i]);
                else failedLinkReply[-0] += `\n${failedLinks[i]}`
            }
            failedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
        }
        if (startedLinks.length != 0) {
            for (let i = 0; i < startedLinks.length; i++) {
                if (startedLinkReply[-0].length + startedLinks[i] >= 2000) reply.push(startedLinks[i]);
                else startedLinkReply[-0] += `\n${startedLinks[i]}`
            }
            startedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
        }
    }
    else if (startedLinks != 0) {
        let failedLinkReply = '**The following provided links were invalid:**'
        let startedLinkReply = '**The Following provided links are for events that have already started**'
        for (let i = 0; i < startedLinks.length; i++) {
            if (startedLinkReply[-0].length + startedLinks[i] >= 2000) reply.push(startedLinks[i]);
            else startedLinkReply[-0] += `\n${startedLinks[i]}`
        }
        await interaction.editReply({ content: startedLinkReply[0], components: [], embeds: []})
        if (startedLinkReply[1]) {
            for (let i = 1; i < startedLinkReply.length; i++) {
                await interaction.followUp({ content: startedLinkReply[i] })
            }
        }
        if (failedLinks.length != 0) {
            for (let i = 0; i < failedLinks.length; i++) {
                if (failedLinkReply[-0].length + failedLinks[i] >= 2000) reply.push(failedLinks[i]);
                else failedLinkReply[-0] += `\n${failedLinks[i]}`
            }
            failedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
        }
    }
    else await interaction.followUp({ content: 'None of the provided links were valid' })
}

module.exports = { addEvents }