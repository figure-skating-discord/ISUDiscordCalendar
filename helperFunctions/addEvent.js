const { Scrapper } = require('../scrapper/scrapper.js')

async function addEvent(interaction, linkArr=undefined) {
    const scrapper = new Scrapper
    if (!linkArr) {
        let fieldInput = interaction.fields.getTextInputValue('linkInput');
        linkArr = fieldInput.split('\n')
    }
    //console.log("linkArr1:", linkArr)

    await interaction.deferReply()

    let passedLinks = []
    let failedLinks = []
    let startedLinks = []

    const eventManager = interaction.guild.scheduledEvents
    let eventCollection = await eventManager.fetch();

    for (let i = 0; i < linkArr.length; i++) {
        //console.log("link in for loop:",linkArr[i])
        let eventStarted = false;
        if (!scrapper.checkValidURL(linkArr[i])) {
            failedLinks.push(linkArr[i])
        }
        else {
            let pageInfo = await scrapper.scrapeSingleEvent(linkArr[i])
            //console.log("pageInfo:", pageInfo)
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

module.exports = { addEvent }