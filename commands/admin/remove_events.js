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
                let eventMap = await interaction.guild.scheduledEvents.fetch();
                //store the data in an array
                //let eventArr = [...eventMap.keys()];
                let targetUser = await interaction.options.getUser('user')
                if (targetUser) {
                    //console.log(eventMap)
                    const [targetEvents, nonTargetEvents] = eventMap.partition(scheduledEvent => scheduledEvent.creator.id == targetUser.id)
                    console.log(targetEvents);
                }
                else console.log('no user specified')
                await interaction.editReply({content: 'test remove'});
        }
}