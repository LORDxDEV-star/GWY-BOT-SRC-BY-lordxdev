const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Giveaway Schema
const guildSettingsSchema = new mongoose.Schema({
  guildId: String,
  prefix: { type: String, default: '!' }
});

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  guildId: String,
  prize: String,
  endTime: Number,
  winners: Number,
  ended: { type: Boolean, default: false },
  participants: [String]
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// Command Collection
client.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  checkGiveaways();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  let guildSettings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!guildSettings) {
    guildSettings = new GuildSettings({ guildId: message.guild.id });
    await guildSettings.save();
  }

  if (!message.content.startsWith(guildSettings.prefix)) return;

  const args = message.content.slice(guildSettings.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  if (command.permissions) {
    const hasPermission = message.member.permissions.has(command.permissions);
    if (!hasPermission) {
      return message.reply(`You need ${command.permissions.join(', ')} permission(s) to use this command!`);
    }
  }

  try {
    await command.execute(message, args, guildSettings, client);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command!');
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name !== '🎉') return;

  const giveaway = await Giveaway.findOne({ messageId: reaction.message.id, ended: false });
  if (!giveaway) return;

  if (!giveaway.participants.includes(user.id)) {
    giveaway.participants.push(user.id);
    await giveaway.save();
  }
});

async function endGiveaway(giveaway) {
  const channel = await client.channels.fetch(giveaway.channelId);
  if (!channel) return;

  const message = await channel.messages.fetch(giveaway.messageId);
  if (!message) return;

  const winners = [];
  const participants = giveaway.participants;

  for (let i = 0; i < Math.min(giveaway.winners, participants.length); i++) {
    const winnerIndex = Math.floor(Math.random() * participants.length);
    winners.push(participants[winnerIndex]);
    participants.splice(winnerIndex, 1);
  }

  const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

  const endEmbed = new EmbedBuilder()
    .setTitle('🎉 Giveaway Ended!')
    .setDescription(`Prize: **${giveaway.prize}**\nWinner(s): ${winners.length > 0 ? winnerMentions : 'No valid participants'}`)
    .setColor('#00FF00')
    .setFooter({ text: 'Giveaway ended' });

  await message.edit({ embeds: [endEmbed] });
  if (winners.length > 0) {
    await channel.send(`Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
  }

  giveaway.ended = true;
  await giveaway.save();
}

async function checkGiveaways() {
  setInterval(async () => {
    const giveaways = await Giveaway.find({ ended: false, endTime: { $lte: Date.now() } });

    for (const giveaway of giveaways) {
      await endGiveaway(giveaway);
    }
  }, 10000);
}

client.login(process.env.DISCORD_TOKEN);