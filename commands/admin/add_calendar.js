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
            .setURL('https://www.isu.org/events')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_2018.png')
            //.setThumbnail('https://cdn2.isu.org/templates/isu/images/logo_footer.png')
            .setThumbnail('https://imgur.com/pnNlUrG.png')
            .setDescription(`Click the button for the ISU calendar you\'d like to add the events from. Then specify how many events you\'d like to add with the drop down.`)
            .addFields(
                { name: '⛸️ Figure Skating', value: 'https://www.isu.org/figure-skating/events/figure-skating-calendar' },
                { name: '🧑‍🤝‍🧑 Synchro', value: 'https://www.isu.org/synchronized-skating/events/synchronized-skating-calendar'},
                { name: '🐇 Speed Skating', value: 'https://www.isu.org/speed-skating/events/speed-skating-calendar'},
                { name: '🦵 Short Track', value: 'https://www.isu.org/short-track/events/short-track-calendar'},
                //{ name: '📚 Development - Figure Skating', value: 'Some value here'},
                //{ name: '😤 [All]()', value: 'Some value here'},
                { name: "Please note, if you're adding a lot of events at once it can take a moment for Discord's API to update the event list. Rest assured the events are still being added",
                value: ' '},
            )
            .setColor(0x454894);

        const figureSkating = new ButtonBuilder()
            .setCustomId('figureSkating')
            .setLabel('⛸️Figure Skating⛸️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        const synchroSkating = new ButtonBuilder()
            .setCustomId('synchro')
            .setLabel('🧑‍🤝‍🧑Synchro🧑‍🤝‍🧑')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

            const speedSkating = new ButtonBuilder()
            .setCustomId('speedSkating')
            .setLabel('🐇Speed Skating🐇')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

            const shortTrack = new ButtonBuilder()
            .setCustomId('shortTrack')
            .setLabel('🦵Short Track🦵')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false);

        const submit = new ButtonBuilder()
            .setCustomId('submit')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(false)

        const menuOptions = ['5', '10', '15', '20', '25', '30', '50', '100'];

        const select = new StringSelectMenuBuilder()
			.setCustomId('eventQuantity')
            .setPlaceholder('One of the buttons from above')
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

        const cancelRow = new ActionRowBuilder()
            .addComponents(cancel);

        const response = await interaction.reply({
            content: '',
            //10 embed per reply limit
            embeds: [embed],
            //ephemeral makes it so only command user sees reply
            ephemeral: false,
            components: [buttonRow, menuRow, cancelRow]
        });


        await awaitSelection(response, interaction.user.id)
       /*  const filter = (interaction) => interaction.customId === 'addEventsModal';
        interaction.awaitMessageComponent(({ filter, time: 1000 })
            .then(interaction => console.log(`${interaction.customId} was submitted!`))
            .catch(console.error)) */
    }
}


async function awaitSelection(response, interactionUserID, calendarSelection = '') {
    let submitted = false;
    let canceled = false;
    const collectorFilter = i => i.user.id === interactionUserID;
        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 600_000 });
            let comps = confirmation.message.components
            let btnRow = comps[0].components
            let menuData = comps[1].components[0].data
            //console.log('confirmation:', confirmation)
            switch (confirmation.customId) {
                //enables selecting a calendar after the user has made an event quanitity selection
                case "eventQuantity":
                    await confirmation.deferReply()
                    const scrapper = new Scrapper(Number(confirmation.values[0]), getCalendarURL(calendarSelection));
                    let eventLinksArr = await scrapper.scrapCalendar()
                    await addEvents(confirmation, eventLinksArr)
                    submitted = true;
                    break;
                case "figureSkating":
                case "synchro":
                case "speedSkating":
                case "shortTrack":
                    calendarSelection = confirmation.customId
                    let btn = btnRow.find(btn => btn.data.custom_id === confirmation.customId)
                    btnRow.forEach(btn => btn.data.style = 2);
                    btn.data.style = 3;
                    menuData.disabled = false;
                    await confirmation.update({components: comps});
                    break;
                case "cancel":
                    canceled = true;
                    await confirmation.update({ content: '# Command Canceled!', components: [], embeds: []});
                    break;
                case "submit":
                    break;
                default:
                    response.reply({ content: 'default switch response' });
            }

        } catch (e) {
            console.log("catch triggered", e)
            //await confirmation.update({ content: '# Selection timed out', components: [], embeds: [] });
        }
        if (!submitted && !canceled) awaitSelection(response, interactionUserID, calendarSelection);
}

function enableCalendarButtons(interactionConfirmation) {
    interactionConfirmation.update({components: []})
}

function enableSubmitButton() {

}

function getCalendarURL(customIDSelection) {
    switch(customIDSelection) {
        case 'figureSkating':
            //console.log('figureSkating')
            return 'https://www.isu.org/figure-skating/events/figure-skating-calendar';
            break;
        case 'synchro':
            //console.log('synchro')
            return 'https://www.isu.org/synchronized-skating/events/synchronized-skating-calendar';
            break;
        case 'speedSkating':
            //console.log('speedSkating')
            return 'https://www.isu.org/speed-skating/events/speed-skating-calendar';
            break;
        case 'shortTrack':
            //console.log('shortTrack')
            return 'https://www.isu.org/short-track/events/short-track-calendar';
            break;
        default:
            console.log('calendar pref undef:', customIDSelection)
            return undefined;
            break;
    }
}