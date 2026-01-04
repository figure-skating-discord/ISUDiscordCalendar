const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const { Scrapper } = require('../../scrapper/scrapper.js')
const { stopInterval, startInterval, intervals } = require('../../helperFunctions/addEventsInterval.js')
const { autoAddEvents } = require('../../helperFunctions/autoAddEvents.js')
const { getFiles } = require('../../helperFunctions/getFiles.js')
const fs = require('node:fs')
const { join } = require('path')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure_auto_events')
        .setDescription('Configures settings for automatically adding events from and ISU calendar at regular intervals')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        //these are not all the embed options see the api doc
        const embed = new EmbedBuilder()
            .setTitle('Calendar Select')
            .setURL('https://isu-skating.com/')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_2018.png')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_footer.png')
            .setThumbnail('https://imgur.com/pnNlUrG.png')
            .setDescription(`Select one or more ISU calendars to enable or disable auto events for. Then specify how many events you\'d like to add for each selected discipline. __**A server cannot have over 100 scheduled events.**__`)
            .addFields(
                { name: '⛸️ Figure Skating', value: 'https://isu-skating.com/figure-skating/events/' },
                { name: '🧑‍🤝‍🧑 Synchro', value: 'https://isu-skating.com/synchronized-skating/events/' },
                { name: '🐇 Speed Skating', value: 'https://isu-skating.com/speed-skating/events/' },
                { name: '🦵 Short Track', value: 'https://isu-skating.com/short-track/events/' },
                //{ name: '📚 Development - Figure Skating', value: 'Some value here'},
                //{ name: '😤 [All]()', value: 'Some value here'},
                {
                    name: "Please note, if you're adding a lot of events at once it can take a moment for Discord's API to update the event list.",
                    value: ' '
                },
                { name: ' ', value: '*Developed by: <@109931759260430336>*'}
            )
            .setColor(0x454894);

        const calendarOptions = [
            { label: 'Figure Skating', value: 'FigureSkating' },
            { label: 'Synchro', value: 'Synchro' },
            { label: 'Speed Skating', value: 'SpeedSkating' },
            { label: 'Short Track', value: 'ShortTrack' }
        ];

        const calendarSelect = new StringSelectMenuBuilder()
            .setCustomId('calendarSelect')
            .setPlaceholder('Select discipline(s)')
            .setMinValues(1)
            .setMaxValues(calendarOptions.length)
            .addOptions(
                ...calendarOptions.map(option => new StringSelectMenuOptionBuilder()
                    .setLabel(option.label)
                    .setValue(option.value)))
            .setDisabled(false);

        //Action Select Row

        const submit = new ButtonBuilder()
            .setCustomId('submit')
            .setLabel('Enable Auto Events')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)

        const disable = new ButtonBuilder()
            .setCustomId('disable')
            .setLabel('Disable Auto Events')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        //Time Interval Select Row

        const oneHr = new ButtonBuilder()
            .setCustomId('oneHr')
            .setLabel('🕛 1 Hour 🕐')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const sixHrs = new ButtonBuilder()
            .setCustomId('sixHrs')
            .setLabel('🕛 6 Hours 🕕')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const twelveHrs = new ButtonBuilder()
            .setCustomId('twelveHrs')
            .setLabel('🕛 12 Hours 🕛')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const oneDay = new ButtonBuilder()
            .setCustomId('oneDay')
            .setLabel('⏰ 1 Day ⏰')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        //Menu Options Row

        const menuOptions = ['5', '10', '15', '20', '25', '30', '50', '100'];

        const select = new StringSelectMenuBuilder()
            .setCustomId('eventQuantity')
            .setPlaceholder('Number of events to add')
            //.setPlaceholder('Select how many events you\'d like to add up to')
            .addOptions(
                ...menuOptions.map(i => new StringSelectMenuOptionBuilder().setLabel(i).setValue(i)))
            .setDisabled(true);

        const menuRow = new ActionRowBuilder()
            .addComponents(select);

        const calendarRow = new ActionRowBuilder()
            .addComponents(calendarSelect);

        const intervalRow = new ActionRowBuilder()
            .addComponents(oneHr, sixHrs, twelveHrs, oneDay);

        const actionRow = new ActionRowBuilder()
            .addComponents(submit, disable, cancel);

        const response = await interaction.reply({
            content: '',
            //10 embed per reply limit
            embeds: [embed],
            components: [calendarRow, menuRow, intervalRow, actionRow]
        });


        await awaitSelection(response, interaction.user.id)
    }
}


async function awaitSelection(response, interactionUserID, calendarSelection = [], eventNum = '', interval = '') {
    let submitted = false;
    let canceled = false;
    let disabled = false;
    const collectorFilter = i => i.user.id === interactionUserID;
    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 600_000 });
        let comps = confirmation.message.components
        let calendarMenuData = comps[0].components[0].data
        let menuData = comps[1].components[0].data
        let intervalRow = comps[2].components
        let submitBtn = comps[3].components[0].data
        let disableBtn = comps[3].components[1].data
        const hasCalendars = () => calendarSelection && calendarSelection.length > 0;
        const updateCalendarMenuDisplay = () => {
            calendarMenuData.placeholder = formatCalendarSelection(calendarSelection, 'Select discipline(s)');
            if (calendarMenuData.options) {
                calendarMenuData.options.forEach(option => {
                    option.default = calendarSelection.includes(option.value);
                });
            }
        };
        const updateSubmitState = () => {
            submitBtn.disabled = !(hasCalendars() && eventNum && interval);
        };
        //console.log('confirmation:', confirmation)
        switch (confirmation.customId) {
            //enables selecting a calendar after the user has made an event quanitity selection
            case "eventQuantity":
                eventNum = Number(confirmation.values[0]);
                menuData.placeholder = `${eventNum}`
                intervalRow.forEach(btn => btn.data.disabled = false)
                updateSubmitState();
                await confirmation.update({ components: comps });
                break;
            case "calendarSelect":
                calendarSelection = confirmation.values || []
                menuData.disabled = calendarSelection.length == 0;
                disableBtn.disabled = calendarSelection.length == 0;
                updateCalendarMenuDisplay();
                updateSubmitState();
                await confirmation.update({ components: comps });
                break;
            case "oneHr":
            case "sixHrs":
            case "twelveHrs":
            case "oneDay":
                switch (confirmation.customId) {
                    case "oneHr":
                        interval = 1;
                        break;
                    case "sixHrs":
                        interval = 6;
                        break;
                    case "twelveHrs":
                        interval = 12;
                        break;
                    case "oneDay":
                        interval = 24;
                        break;
                }

                let intervalBtn = intervalRow.find(btn => btn.data.custom_id === confirmation.customId)
                intervalRow.forEach(btn => btn.data.style = 2);
                intervalBtn.data.style = 1;
                updateSubmitState();
                await confirmation.update({ components: comps });
                break;
            case "cancel":
                canceled = true;
                await confirmation.update({ content: '**Command Canceled!**', components: [], embeds: [] });
                break;
            case "submit":
                await confirmation.reply(`__**${formatCalendarSelection(calendarSelection)} Auto Event Updating Enabled!**__
**Update Interval:** \`${interval} Hour(s)\`
**Number of Events:** \`${eventNum}\``)
                for (const selection of calendarSelection) {
                    const calendarUrl = getCalendarURL(selection);
                    if (!calendarUrl) {
                        continue;
                    }
                    try {
                        const scrapper = new Scrapper(eventNum, calendarUrl);
                        const [eventLinksArr, canceledEvents] = await scrapper.scrapCalendar({ upcomingOnly: true })
                        await autoAddEvents(confirmation.guild, eventLinksArr, canceledEvents)
                    }
                    catch (e) {
                        console.log(e)
                    }
                    await toggleUpdateInverval(confirmation.guild, eventNum, calendarUrl, selection, true, interval, eventNum)
                }
                submitted = true;
                break;
            case 'disable':
                disabled = true;
                for (const selection of calendarSelection) {
                    const calendarUrl = getCalendarURL(selection);
                    if (!calendarUrl) {
                        continue;
                    }
                    await toggleUpdateInverval(confirmation.guild, eventNum, calendarUrl, selection, false, interval, eventNum)
                }
                await confirmation.update({ content: `**${formatCalendarSelection(calendarSelection)} Auto Events Disabled!**`, components: [], embeds: [] });
                break;
            default:
                console.log('default switch response')
        }

    } catch (e) {
        console.log("catch triggered", e)
        //await confirmation.update({ content: '# Selection timed out', components: [], embeds: [] });
    }
    if (!submitted && !canceled && !disabled) {
        //console.log('calendar:', calendarSelection, 'event quantity:', eventNum, 'interval:', interval)
        awaitSelection(response, interactionUserID, calendarSelection, eventNum, interval);
    }
    //else console.log('calendar:', calendarSelection, 'event quantity:', eventNum, 'interval:', interval);
}

function normalizeCalendarKey(value) {
    return value ? value.toLowerCase() : '';
}

function formatCalendarSelection(selections, emptyValue) {
    if (!selections || selections.length === 0) {
        return emptyValue || 'No Calendars Selected';
    }
    const labels = {
        figureskating: 'Figure Skating',
        synchro: 'Synchro',
        speedskating: 'Speed Skating',
        shorttrack: 'Short Track'
    };
    return selections
        .map(selection => labels[normalizeCalendarKey(selection)] || selection)
        .join(', ');
}

function getCalendarURL(customIDSelection) {
    if (!customIDSelection) {
        return undefined;
    }
    const normalized = normalizeCalendarKey(customIDSelection);
    const calendarUrls = {
        figureskating: 'https://isu-skating.com/figure-skating/events/',
        synchro: 'https://isu-skating.com/synchronized-skating/events/',
        speedskating: 'https://isu-skating.com/speed-skating/events/',
        shorttrack: 'https://isu-skating.com/short-track/events/'
    };
    if (!calendarUrls[normalized]) {
        console.log('calendar pref undef:', customIDSelection)
        return undefined;
    }
    return calendarUrls[normalized];
}

async function toggleUpdateInverval(guild, calLimit, calUrl, calId, toggle = false, interval = 0, eventNum) {
    try {
        let foundFile = false;
        if (toggle === true) {
            //console.log('clearing existing interval')
            //delete first to prevent multiple interval updates for the same calendar
            stopInterval(guild, calId)

            //convert the interval from hours to ms
            let i = interval * 60 * 60 * 1000
            startInterval(guild, calLimit, calUrl, calId, i)
            //console.log(intervals)
        }
        if (toggle === false) {
            stopInterval(guild, calId)
        }
        const files = getFiles(`${__dirname}/../../guildSettingsFiles`, 'json')

        let targetFilePattern = new RegExp(`.*${guild.id}\\.json.*`)
        let settings;
        let calendars;

        for (const file of files) {
            if (file.match(targetFilePattern)) {
                settings = require(file);
                calendars = settings.autoAddEvents.calendars
                foundFile = true;
                if (toggle) {
                    if (calendars) {
                        //console.log('updating existing guild settings')
                        calendars[calId] = {
                            enabled: toggle,
                            interval: interval,
                            url: calUrl,
                            numEvents: eventNum,
                            filters: ""
                        }
                    }
                }
                else if (!toggle && calendars[calId]) {
                    delete calendars[calId]
                }
            }
        }
        if (!foundFile && toggle) {
            settings = {
                guildId: guild.id,
                autoAddEvents: {
                    calendars: {
                        [calId]: {
                            enabled: toggle,
                            interval: interval,
                            url: calUrl,
                            numEvents: eventNum,
                            filters: ""
                        }
                    }
                }
            };
        }
        const settingsJSON = JSON.stringify(settings, null, 2);
        let path = join(__dirname, '../../guildSettingsFiles', `${guild.id}.json`)
        //console.log('path:', path)
        fs.writeFileSync(path, settingsJSON, 'utf8');
    }
    catch (e) {
        console.log(e)
    }
}
