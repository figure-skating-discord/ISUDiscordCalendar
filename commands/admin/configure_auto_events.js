const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const { Scrapper } = require('../../scrapper/scrapper.js')
const { stopInterval, startInterval, intervals } = require('../../helperFunctions/addEventsInterval.js')
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
            .setURL('https://www.isu.org/events')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_2018.png')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_footer.png')
            .setThumbnail('https://imgur.com/pnNlUrG.png')
            .setDescription(`Click the button for the ISU calendar you\'d like to add the events from **OR** disable auto events for. Then specify how many events you\'d like to add with the drop down.`)
            .addFields(
                { name: '⛸️ Figure Skating', value: 'https://www.isu.org/figure-skating/events/figure-skating-calendar' },
                { name: '🧑‍🤝‍🧑 Synchro', value: 'https://www.isu.org/synchronized-skating/events/synchronized-skating-calendar' },
                { name: '🐇 Speed Skating', value: 'https://www.isu.org/speed-skating/events/speed-skating-calendar' },
                { name: '🦵 Short Track', value: 'https://www.isu.org/short-track/events/short-track-calendar' },
                //{ name: '📚 Development - Figure Skating', value: 'Some value here'},
                //{ name: '😤 [All]()', value: 'Some value here'},
                {
                    name: "Please note, if you're adding a lot of events at once it can take a moment for Discord's API to update the event list.",
                    value: ' '
                },
            )
            .setColor(0x454894);

        //Calendar Select Row

        const figureSkating = new ButtonBuilder()
            .setCustomId('FigureSkating')
            .setLabel('⛸️Figure Skating⛸️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        const synchroSkating = new ButtonBuilder()
            .setCustomId('Synchro')
            .setLabel('🧑‍🤝‍🧑Synchro🧑‍🤝‍🧑')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        const speedSkating = new ButtonBuilder()
            .setCustomId('SpeedSkating')
            .setLabel('🐇Speed Skating🐇')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        const shortTrack = new ButtonBuilder()
            .setCustomId('ShortTrack')
            .setLabel('🦵Short Track🦵')
            .setStyle(ButtonStyle.Secondary)
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
                new StringSelectMenuOptionBuilder()
                    .setLabel('All')
                    .setValue('0'),
                ...menuOptions.map(i => new StringSelectMenuOptionBuilder().setLabel(i).setValue(i)))
            .setDisabled(true);

        const menuRow = new ActionRowBuilder()
            .addComponents(select);

        const buttonRow = new ActionRowBuilder()
            .addComponents(figureSkating, synchroSkating, speedSkating, shortTrack);

        const intervalRow = new ActionRowBuilder()
            .addComponents(oneHr, sixHrs, twelveHrs, oneDay);

        const actionRow = new ActionRowBuilder()
            .addComponents(submit, disable, cancel);

        const response = await interaction.reply({
            content: '',
            //10 embed per reply limit
            embeds: [embed],
            //ephemeral makes it so only command user sees reply
            ephemeral: false,
            components: [buttonRow, menuRow, intervalRow, actionRow]
        });


        await awaitSelection(response, interaction.user.id)
    }
}


async function awaitSelection(response, interactionUserID, calendarSelection = '', eventNum = '', interval = '') {
    let submitted = false;
    let canceled = false;
    let disabled = false;
    const collectorFilter = i => i.user.id === interactionUserID;
    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 600_000 });
        let comps = confirmation.message.components
        let calRow = comps[0].components
        let menuData = comps[1].components[0].data
        let intervalRow = comps[2].components
        let submitBtn = comps[3].components[0].data
        let disableBtn = comps[3].components[1].data
        //console.log('confirmation:', confirmation)
        switch (confirmation.customId) {
            //enables selecting a calendar after the user has made an event quanitity selection
            case "eventQuantity":
                eventNum = Number(confirmation.values[0]);
                menuData.placeholder = `${eventNum}`
                intervalRow.forEach(btn => btn.data.disabled = false)
                await confirmation.update({ components: comps });
                break;
            case "FigureSkating":
            case "Synchro":
            case "SpeedSkating":
            case "ShortTrack":
                calendarSelection = confirmation.customId
                let calBtn = calRow.find(btn => btn.data.custom_id === confirmation.customId)
                calRow.forEach(btn => btn.data.style = 2);
                calBtn.data.style = 1;
                menuData.disabled = false;
                disableBtn.disabled = false;
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
                submitBtn.disabled = false;
                await confirmation.update({ components: comps });
                break;
            case "cancel":
                canceled = true;
                await confirmation.update({ content: '**Command Canceled!**', components: [], embeds: [] });
                break;
            case "submit":
                await confirmation.reply(`__**${calendarSelection.match(/[A-Z][a-z]+|[0-9]+/g).join(" ")} Auto Event Updating Enabled!**__\n**Update Interval:** \`${interval} Hour(s)\`\n**Number of Events:** \`${eventNum}\``)
                await toggleUpdateInverval(confirmation.guild, eventNum, getCalendarURL(calendarSelection), calendarSelection, true, interval, eventNum)
                submitted = true;
                break;
            case 'disable':
                disabled = true;
                await toggleUpdateInverval(confirmation.guild, eventNum, getCalendarURL(calendarSelection), calendarSelection, false, interval, eventNum)
                await confirmation.update({ content: `**${calendarSelection.match(/[A-Z][a-z]+|[0-9]+/g).join(" ")} Auto Events Disabled!**`, components: [], embeds: [] });
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

function getCalendarURL(customIDSelection) {
    switch (customIDSelection) {
        case 'FigureSkating':
            //console.log('figureSkating')
            return 'https://www.isu.org/figure-skating/events/figure-skating-calendar';
            break;
        case 'Synchro':
            //console.log('synchro')
            return 'https://www.isu.org/synchronized-skating/events/synchronized-skating-calendar';
            break;
        case 'SpeedSkating':
            //console.log('speedSkating')
            return 'https://www.isu.org/speed-skating/events/speed-skating-calendar';
            break;
        case 'ShortTrack':
            //console.log('shortTrack')
            return 'https://www.isu.org/short-track/events/short-track-calendar';
            break;
        default:
            console.log('calendar pref undef:', customIDSelection)
            return undefined;
            break;
    }
}

async function toggleUpdateInverval(guild, calLimit, calUrl, calId, toggle = false, interval = 0, eventNum) {
    try {
        let foundFile = false;
        if (toggle === true) {
            //console.log('clearing existing interval')
            //delete first to prevent multiple interval updates for the same calendar
            stopInterval(guild, calId)

            //convert the interval from hours to ms
            let i = interval *60*60 *1000
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