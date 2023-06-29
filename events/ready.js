const { getFiles } = require('../helperFunctions/getFiles.js')
const { startInterval } = require('../helperFunctions/addEventsInterval.js')
const { fs } = require('fs');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`logged in as ${client.user.tag}`);
        const oneDay = 60*60*1000
        try {

            const files = getFiles(`${__dirname}/../guildSettingsFiles`, 'json')

            let targetFilePattern = new RegExp(`.*example\.json.*`)
            let settings;

            for (const file of files) {
                if (!file.match(targetFilePattern)) {
                    const settings = require(file);
                    let cals = settings.autoAddEvents.calendars
                    if (cals) {
                        for (let cal in cals) {
                            const guild = await client.guilds.fetch(settings.guildId)
                            //console.log(cals[cal])
                            startInterval(guild, cals[cal].numEvents, cals[cal].url, cal, cals[cal].interval*oneDay)
                        }
                    }
                }
            }
        }
        catch (e) {
            console.log("couldn't start Interval", e)
        }
    }
}