const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const { addEvents } = require('../../helperFunctions/addEvents.js')
const { Scrapper } = require('../../scrapper/scrapper.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_calendar')
        .setDescription('Adds events from an ISU calendar once')
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
            .setDescription(`Select one or more ISU calendars to add events from. Then specify how many events you\'d like to add for each selected discipline. __**A server cannot have over 100 scheduled events.**__`)
            .addFields(
                { name: '⛸️ Figure Skating', value: 'https://isu-skating.com/figure-skating/events/' },
                { name: '🧑‍🤝‍🧑 Synchro', value: 'https://isu-skating.com/synchronized-skating/events/'},
                { name: '🐇 Speed Skating', value: 'https://isu-skating.com/speed-skating/events/'},
                { name: '🦵 Short Track', value: 'https://isu-skating.com/short-track/events/'},
                //{ name: '📚 Development - Figure Skating', value: 'Some value here'},
                //{ name: '😤 [All]()', value: 'Some value here'},
                { name: "Please note, if you're adding a lot of events at once it can take a moment for Discord's API to update the event list.",
                value: ' '},
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
            .setLabel('Add Events')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

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

        const actionRow = new ActionRowBuilder()
            .addComponents(submit, cancel);

        const response = await interaction.reply({
            content: '',
            //10 embed per reply limit
            embeds: [embed],
            components: [calendarRow, menuRow, actionRow]
        });


        await awaitSelection(response, interaction.user.id)
    }
}


async function awaitSelection(response, interactionUserID, calendarSelection = [], eventNum = undefined) {
    let submitted = false;
    let canceled = false;
    const collectorFilter = i => i.user.id === interactionUserID;
    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 600_000 });
        let comps = confirmation.message.components
        let calendarMenuData = comps[0].components[0].data
        let menuData = comps[1].components[0].data
        let submitBtn = comps[2].components[0].data
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
            submitBtn.disabled = !(hasCalendars() && eventNum);
        };
        switch (confirmation.customId) {
            //enables selecting a calendar after the user has made an event quanitity selection
            case "eventQuantity":
                eventNum = Number(confirmation.values[0]);
                menuData.placeholder = `${eventNum}`
                updateSubmitState();
                await confirmation.update({ components: comps });
                break;
            case "calendarSelect":
                calendarSelection = confirmation.values || []
                menuData.disabled = calendarSelection.length == 0;
                updateCalendarMenuDisplay();
                updateSubmitState();
                await confirmation.update({ components: comps });
                break;
            case "cancel":
                canceled = true;
                await confirmation.update({ content: '# Command Canceled!', components: [], embeds: [] });
                break;
            case "submit":
                await confirmation.deferReply()
                for (const selection of calendarSelection) {
                    const calendarUrl = getCalendarURL(selection);
                    if (!calendarUrl) {
                        continue;
                    }
                    const scrapper = new Scrapper(eventNum, calendarUrl);
                    const [eventLinksArr, canceledEvents] = await scrapper.scrapCalendar({ upcomingOnly: true })
                    await addEvents(confirmation, eventLinksArr, canceledEvents)
                }
                submitted = true;
                break;
            default:
                console.log('default switch response')
        }

    } catch (e) {
        console.log("catch triggered", e)
        //await confirmation.update({ content: '# Selection timed out', components: [], embeds: [] });
    }
    if (!submitted && !canceled) {
        //console.log('calendar:', calendarSelection, 'event quantity:', eventNum)
        awaitSelection(response, interactionUserID, calendarSelection, eventNum);
    }
    //else console.log('calendar:', calendarSelection, 'event quantity:', eventNum);
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

function normalizeCalendarKey(value) {
    return value ? value.toLowerCase() : '';
}

function formatCalendarSelection(selections, emptyValue) {
    if (!selections || selections.length === 0) {
        return emptyValue || 'Select discipline(s)';
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
