const { Scrapper } = require('../scrapper/scrapper.js')
const { loadingBar } = require('./loadingBar.js');

async function addEvents(interaction, linkArr = undefined) {
    let numEventsProcessed = 0;
    let progress;
    try {
        const scrapper = new Scrapper
        if (!linkArr) {
            let fieldInput = interaction.fields.getTextInputValue('linkInput');
            linkArr = fieldInput.split('\n');
            //progress = await interaction.followUp({ content: `Number of events processed: ${numEventsProcessed}/${linkArr.length}\n${loadingBar(numEventsProcessed, linkArr.length)}` });
        }
       if (linkArr.length != 0) {
            progress = await interaction.followUp({ content: `Number of events processed: ${numEventsProcessed}/${linkArr.length}\n${loadingBar(numEventsProcessed, linkArr.length)}` });
       }

        let passedLinks = []
        let failedLinks = []
        let canceledLinks = []
        let endedLinks = []

        const eventManager = interaction.guild.scheduledEvents
        let eventCollection = await eventManager.fetch();

        for (let i = 0; i < linkArr.length; i++) {
            let eventStarted = false;
            let eventEnded = false;
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
                    let lvlsStr = ''
                    let resultStr = ''
                    if (!pageInfo.canceled) {
                        const currentDate = new Date;
                        if (pageInfo.scheduledStartTime.getTime() < currentDate.getTime()) {
                            eventStarted = true;
                            if (pageInfo.scheduledEndTime.getTime() < currentDate.getTime()) {
                                endedLinks.push(linkArr[i])
                                eventEnded = true
                            }
                        }

                        if (pageInfo.levels) {
                            lvlsStr = '\n\n**__Disciplines and Levels__:**'
                            let lvls = pageInfo.levels
                            for(let i = 0; i < pageInfo.levels.length; i++) {
                                const key = Object.keys(lvls[i])[0]
                                if(lvls[i][key].levels) lvlsStr += `\n**${key}:** ${lvls[i][key].levels}`;
                            }
                        }
    
                        if (pageInfo.results) resultStr = `\n\n**__Results Page__:**\n${pageInfo.results}`
                    }

                    let pageURLReg = new RegExp(`.*${pageInfo.link.trim()}.*`)
                    let existingEvent = await eventCollection.find((scheduledEvent) => {
                        return scheduledEvent.description.match(pageURLReg) //&& scheduledEvent.name === pageInfo.name
                    })
                    if (existingEvent && existingEvent.creator.bot) {
                        /*The following checks if anything is different before making a api request
                         Image from page info will always be different in this case though :\ 
                        let editArgObj = {}
                         if (existingEvent.scheduledStartTime.getTime() !== infoPage.scheduledStartTime.getTime()) editArgObj[scheduledStartTime] = pageInfo.scheduledStartTime
                         if (existingEvent.scheduledEndTime.getTime() !== infoPage.scheduledEndTime.getTime()) editArgObj[scheduledEndTime] = pageInfo.scheduledEndTime
                         if (existingEvent.entityMetadata.location !== pageInfo.location) editArgObj[entityMetadata] = { location: pageInfo.location }
                         if (existingEvent.image) */

                        if (pageInfo.canceled) {
                            existingEvent.delete()
                            canceledLinks.push(linkArr[i])
                        }
                        else if (eventStarted && !eventEnded) {
                            await existingEvent.edit({
                                scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                                description: `**CLICK EVENT FOR MORE INFO!**${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${pageInfo.link}`, entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                            });
                            passedLinks.push(linkArr[i]);
                        }
                        else {
                            await existingEvent.edit({
                                scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(), scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                                description: `**CLICK EVENT FOR MORE INFO!**${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${pageInfo.link}`, entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                            });
                            passedLinks.push(linkArr[i]);
                        }
                    }
                    else if (pageInfo.canceled) canceledLinks.push(linkArr[i])
                    else if (!eventStarted) {
                        const guild = interaction.guild;
                        await guild.scheduledEvents.create({
                            name: pageInfo.name, scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(), scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                            privacyLevel: 2, entityType: 3, description: `**CLICK EVENT FOR MORE INFO!**${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${pageInfo.link}`,
                            entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                        });
                        passedLinks.push(linkArr[i]);
                    }
                }
            }
            numEventsProcessed++;
            //console.log(`Number of events processed: ${numEventsProcessed}/${linkArr.length}`);
            await progress.edit({ content: `Number of events processed: ${numEventsProcessed}/${linkArr.length}\n${loadingBar(numEventsProcessed, linkArr.length)}` })
        }
        if (passedLinks.length != 0) {
            let reply = ['**The following events were accepted:**']
            let failedLinkReply = ['**Failed to retrieve the following links:**']
            let endedLinkReply = ['**The following events have already ended**']
            let canceledLinkReply = ['**The following events have been canceled:**']
            for (let i = 0; i < passedLinks.length; i++) {
                if (reply.findLast(e => e == e).length + passedLinks[i].length >= 2000) reply.push(passedLinks[i]);
                else reply[reply.length-1] += `\n${passedLinks[i]}`
            }
            await interaction.editReply({ content: reply[0], components: [], embeds: [] })
            if (reply[1]) {
                for (let i = 1; i < reply.length; i++) {
                    await interaction.followUp({ content: reply[i] })
                }
            }
            if (failedLinks.length != 0) {
                for (let i = 0; i < failedLinks.length; i++) {
                    if (failedLinkReply.findLast(e => e == e).length + failedLinks[i].length >= 2000) reply.push(failedLinks[i]);
                    else failedLinkReply[failedLinkReply.length-1] += `\n${failedLinks[i]}`
                }
                failedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
            }
            if (endedLinks.length != 0) {
                for (let i = 0; i < endedLinks.length; i++) {
                    if (endedLinkReply.findLast(e => e == e).length + endedLinks[i].length >= 2000) reply.push(endedLinks[i]);
                    else endedLinkReply[endedLinkReply.length-1] += `\n${endedLinks[i]}`
                }
                endedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
            }
            if (canceledLinks.length != 0) {
                for (let i = 0; i < canceledLinks.length; i++) {
                    if (canceledLinkReply.findLast(e => e == e).length + canceledLinks[i].length >= 2000) reply.push(canceledLinks[i]);
                    else canceledLinkReply[canceledLinkReply.length-1] += `\n${canceledLinks[i]}`
                }
                canceledLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
            }
        }
        else if (endedLinks.length != 0 || canceledLinks.length != 0) {
            let failedLinkReply = ['**Failed to retrieve the following links:**']
            let endedLinkReply = ['**The following events have already ended:**']
            let canceledLinkReply = ['**The following events have been canceled:**']
            for (let i = 0; i < endedLinks.length; i++) {
                if (endedLinkReply.findLast(e => e == e).length + endedLinks[i].length >= 2000) reply.push(endedLinks[i]);
                else endedLinkReply[endedLinkReply.length-1] += `\n${endedLinks[i]}`
            }
            for (let i = 0; i < canceledLinks.length; i++) {
                if (canceledLinks.findLast(e => e == e).length + canceledLinks[i].length >= 2000) reply.push(canceledLinks[i]);
                else canceledLinkReply[canceledLinkReply.length-1] += `\n${canceledLinks[i]}`
            }
            if (endedLinks.length != 0) {
                await interaction.editReply({ content: endedLinkReply[0], components: [], embeds: [] })
            }
            else if (canceledLinks.length != 0) {
                await interaction.editReply({ content: canceledLinkReply[0], components: [], embeds: [] })
            }
            if (endedLinkReply[1]) {
                for (let i = 1; i < endedLinkReply.length; i++) {
                    await interaction.followUp({ content: endedLinkReply[i] })
                }
            }
            if (endedLinks.length != 0) {
                await interaction.followUp({ content: canceledLinkReply[0], components: [], embeds: [] })
            }
            if (canceledLinkReply[1]) {
                for (let i = 1; i < canceledLinkReply.length; i++) {
                    await interaction.followUp({ content: canceledLinkReply[i] })
                }
            }
            if (failedLinks.length != 0) {
                for (let i = 0; i < failedLinks.length; i++) {
                    if (failedLinkReply.findLast(e => e == e).length + failedLinks[i].length >= 2000) reply.push(failedLinks[i]);
                    else failedLinkReply[failedLinkReply.length-1] += `\n${failedLinks[i]}`
                }
                failedLinkReply.forEach(async msg => await interaction.followUp({ content: msg }));
            }
        }
        else if (canceledLinks != 0) {
            // TODO: Add removal of canceled events.
        }
        else await interaction.followUp({ content: 'None of the provided links were valid' })
    } catch (error) {
        if (error.code == 30038) {
            //console.log('DiscordAPIError[30038] Maximum number of uncompleted guild scheduled events reached (100)')
            await progress.edit({ content: `Number of events processed: ${numEventsProcessed}/${linkArr.length} **(Canceled)**\n# Maximum Number of Server Events Reached!` })
        }
        else {
            console.log(error)
        }
    }
}

module.exports = { addEvents }