export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // set to true or remove if you want to welcome users
    const welcomeUser = false
    if (welcomeUser) {
      const welcomeRole = await member.guild.roles.cache.find(
        (role) => role.id === '1117320796734509106',
      )
      await member.roles.add(welcomeRole)

      const welcomeChannel = await member.guild.channels.cache.find(
        (channel) => channel.id === '1116975978686722130',
      )
      await welcomeChannel.fetch()

      welcomeChannel.send(`Welcome ${member.user}`)
      console.log(`${member.user} joined`)
    }
  },
}
