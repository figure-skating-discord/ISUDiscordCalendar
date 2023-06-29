const { Scrapper } = require('../scrapper/scrapper.js')
const { loadingBar } = require('./loadingBar.js');

async function autoAddEvents(guild, linkArr = undefined) {
    try {

        const scrapper = new Scrapper
        //console.log("guild at auto add Events top:", guild)
        const eventManager = guild.scheduledEvents
        let eventCollection = await eventManager.fetch();

        for (let i = 0; i < linkArr.length; i++) {
            let eventStarted = false;
            if (!scrapper.checkValidURL(linkArr[i])) {
                failedLinks.push(linkArr[i])
            }
            else {
                let pageInfo = await scrapper.scrapeSingleEvent(linkArr[i])
                if (!pageInfo) {
                    continue;
                }
                else {
                    const currentDate = new Date;
                    if (pageInfo.scheduledStartTime.getTime() < currentDate.getTime()) {
                        eventStarted = true;
                        continue;
                    }

                    let lvlsStr = ''

                         if (pageInfo.levels) {
                            lvlsStr = '\n\n**__Disciplines and Levels__:**'
                            let lvls = pageInfo.levels
                            for(let i = 0; i < pageInfo.levels.length; i++) {
                                const key = Object.keys(lvls[i])[0]
                                if(lvls[i][key].levels) lvlsStr += `\n**${key}:** ${lvls[i][key].levels}`;
                            }
                         }

                    let resultStr = ''

                    if (pageInfo.results) resultStr = `\n\n**__Results Page__:**\n${pageInfo.results}`

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
                            description: `**CLICK EVENT FOR MORE INFO!**${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${pageInfo.link}`, entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                        });
                    }
                    else if (!eventStarted) {
                        await guild.scheduledEvents.create({
                            name: pageInfo.name, scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(), scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                            privacyLevel: 2, entityType: 3, description: `**CLICK EVENT FOR MORE INFO!**${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${pageInfo.link}`,
                            entityMetadata: { location: pageInfo.location }, image: pageInfo.coverImgB64
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = { autoAddEvents }