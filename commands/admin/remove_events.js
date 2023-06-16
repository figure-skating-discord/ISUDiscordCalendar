const { SlashCommandBuilder, GuildScheduledEvent, Collection } = require('discord.js');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('remove_events')
                .setDescription('removes_guild_scheduled_events')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Deletes all events made by this user. Leave blank to delete all events')
                        .setRequired(false)),

        async execute(interaction) {
                await interaction.deferReply()
                const eventManager = interaction.guild.scheduledEvents
                let eventCollection = await eventManager.fetch();
                let reply = '**The following Events are being removed:**';
                //store the data in an array
                //;
                let targetUser = await interaction.options.getUser('user')
                if (targetUser) {
                    //console.log(eventMap)
                    const [targetEvents, nonTargetEvents] = eventCollection.partition(scheduledEvent => scheduledEvent.creator.id == targetUser.id)
                    console.log(targetEvents);
                    await targetEvents.forEach((event) => {
                        reply += `\n${event.name}`
                        event.delete()
                    })
                }
                else {
                    await eventCollection.forEach((event) => {
                        reply += `\n${event.name}`
                        event.delete()
                    })
                }
                await interaction.editReply({content: `${reply}\n**If you are deleting a lot of events at once please allow the discord API a moment to process the delete requests.**`});
        }
}