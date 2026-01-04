const { Scrapper } = require('../scrapper/scrapper.js')
const { loadingBar } = require('./loadingBar.js');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDescription = (pageInfo, lvlsStr, resultStr) => {
    const statusLine = pageInfo.canceled ? '**STATUS: CANCELED**\n' : '';
    const disciplineLine = pageInfo.discipline ? `\n\n__**Discipline:**__ ${pageInfo.discipline}` : '';
    const eventLink = pageInfo.link || 'Unavailable';
    return `${statusLine}**CLICK EVENT FOR MORE INFO!**${disciplineLine}${lvlsStr}${resultStr}\n\n__**ISU Competition Page:**__\n${eventLink}`;
};

async function autoAddEvents(guild, linkArr = undefined, canceledEvents = undefined) {
    try {

        const scrapper = new Scrapper
        //console.log("guild at auto add Events top:", guild)
        const eventManager = guild.scheduledEvents
        let eventCollection = await eventManager.fetch();

        const eventItems = Array.isArray(linkArr) ? linkArr : [];

        for (let i = 0; i < eventItems.length; i++) {
            let eventStarted = false;
            let eventEnded = false;
            const eventRef = eventItems[i];
            const link = typeof eventRef === 'string'
                ? eventRef
                : eventRef?.detailUrl || eventRef?.link;

            if (link && !scrapper.checkValidURL(link)) {
                continue;
            }

            const pageInfo = await scrapper.scrapeSingleEvent(link, typeof eventRef === 'object' ? eventRef : undefined);
            if (!pageInfo || !pageInfo.scheduledStartTime || !pageInfo.scheduledEndTime) {
                continue;
            }

            let lvlsStr = ''
            let resultStr = ''
            if (canceledEvents && canceledEvents.length !== 0 && link &&
                 canceledEvents.includes(link)) {
                pageInfo.canceled = true
            }

            if (!pageInfo.canceled) {
                const currentDate = new Date;
                if (pageInfo.scheduledStartTime.getTime() < currentDate.getTime()) {
                    eventStarted = true;
                    if (pageInfo.scheduledEndTime.getTime() < currentDate.getTime()) {
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

            const description = buildDescription(pageInfo, lvlsStr, resultStr);
            const pageURLReg = pageInfo.link ? new RegExp(`.*${escapeRegExp(pageInfo.link.trim())}.*`) : undefined;
            const existingEvent = pageURLReg
                ? await eventCollection.find((scheduledEvent) => {
                    return scheduledEvent.description.match(pageURLReg)
                })
                : undefined;

            if (existingEvent && existingEvent.creator.bot) {
                const updatePayload = {
                    description,
                    entityMetadata: { location: pageInfo.location }
                };

                if (!pageInfo.canceled) {
                    if (eventStarted && !eventEnded) {
                        updatePayload.scheduledEndTime = pageInfo.scheduledEndTime.toUTCString();
                    }
                    else {
                        updatePayload.scheduledStartTime = pageInfo.scheduledStartTime.toUTCString();
                        updatePayload.scheduledEndTime = pageInfo.scheduledEndTime.toUTCString();
                    }
                }
                else {
                    updatePayload.scheduledStartTime = pageInfo.scheduledStartTime.toUTCString();
                    updatePayload.scheduledEndTime = pageInfo.scheduledEndTime.toUTCString();
                }

                if (pageInfo.coverImgB64) {
                    updatePayload.image = pageInfo.coverImgB64;
                }

                await existingEvent.edit(updatePayload);
                continue;
            }

            if (!pageInfo.canceled && !eventStarted) {
                const createPayload = {
                    name: pageInfo.name,
                    scheduledStartTime: pageInfo.scheduledStartTime.toUTCString(),
                    scheduledEndTime: pageInfo.scheduledEndTime.toUTCString(),
                    privacyLevel: 2,
                    entityType: 3,
                    description,
                    entityMetadata: { location: pageInfo.location }
                };

                if (pageInfo.coverImgB64) {
                    createPayload.image = pageInfo.coverImgB64;
                }

                await guild.scheduledEvents.create(createPayload);
            }
        }
    } catch (error) {
        //max guild scheduled events
        if (error.code == 30038) {
            //console.log('DiscordAPIError[30038] Maximum number of uncompleted guild scheduled events reached (100)')
        }
        //guild event not found (attempting to edit deleted event)
        else if (error.code == 10070) {
            //console.log('DiscordAPIError[10070]: Unknown Guild Scheduled Event')
        }
        else {
            console.log(error)
        }
    }
}

module.exports = { autoAddEvents }
