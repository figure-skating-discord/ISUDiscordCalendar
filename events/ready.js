const { getFiles } = require('../helperFunctions/getFiles.js')
const { startInterval } = require('../helperFunctions/addEventsInterval.js')
const  fs  = require('fs');

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
                    if (client.guilds.cache.find(guildId => guildId == settings.guildId)){
                        if (cals) {
                            for (let cal in cals) {
                                console.log(client.guilds.cache)
                                const guild = await client.guilds.fetch(settings.guildId)
                                //console.log(cals[cal])
                                startInterval(guild, cals[cal].numEvents, cals[cal].url, cal, cals[cal].interval*oneDay)
                            }
                        }
                    }
                    else {
                        fs.unlink(file, (err) => {
                            if (err) {
                                throw err;
                            }
                        
                            console.log("Delete guild setting file for guild bot is no longer a part of");
                        });
                    }
                }
            }
        }
        catch (e) {
            console.log(e)
        }
    }
}