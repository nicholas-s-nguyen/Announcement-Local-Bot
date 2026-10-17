import dotenv from "dotenv";
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {Client, GatewayIntentBits, Message, Partials, ButtonBuilder,
  ButtonStyle, ActionRowBuilder, SlashCommandBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle

} from 'discord.js';

/*Agenda

  TODO:
  *adding people to and from the list if they're not a TO
  *add / commands
*/
// Takes an arry of intents for data
// you want access too
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkWeeklyReminders, 60_000);
});

//can use the client to listen to events
client.login(process.env.DISCORD_TOKEN);

let MN_TOs ={"375118870685679616": "grizhawk",
  "119592871962607616": "bigwill",
  "434840414919458837": "tegnarr",
  "319530432200966145": "carrfam",
  "199010608270671873": "trippybutter",
  "251072067036905472": "blrasmu",
  "702696795037368320": "definitlyalex",
  "189182425094422528":"kingfailbot",
  "269311308283904001":"coachpauly",
  "218546120924594189": "fennix2001",
  "152561799806320641": "nitt_",
  "943223437055369256": "coachnuke",
  "265248669425467392": "quank64",
  "290133019958837249":"roan.png",
  "285129459692994561": "sacaetw",
  "145720538755629056":"ori0n_ssb",
  "247867927863361536": "a_n",
  "393913625267404818":"studentx",
  "305526520162811907": "senam",
  "348645042249793537": "sunsteel",
  "269627584621445122": "blazek114",
  "190239922848792576": "glasshalfemtea",
  "477216523354898442": "themustacheman39",
  "1037860266798493716": "beetlethe",
  "188382416379969537": "vanbungle"
};
let MN_TO_IDs=Object.keys(MN_TOs);

const ANNOUNCE_CHANNEL_ID = '1542416901429399616';
const SACAETW_ID = '285129459692994561';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const WEEK_MS = 6 * 24 * 60 * 60 * 1000; // fire-again guard: at least 6 days since last fire

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}
function saveJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Saved by name so the same announcement can be resent later or reused
// by a weekly reminder. Survives restarts since it's written to disk.
function saveAnnouncement(name, text) {
  const store = loadJson(ANNOUNCEMENTS_FILE);
  store[name] = text;
  saveJson(ANNOUNCEMENTS_FILE, store);
}

// Tracks users who are mid-flow (answering prompts) so their replies
// aren't treated as a fresh DM that re-triggers intro().
const activeFlows = new Set();

// Sends promptText, waits for the user's next DM, and returns the text.
// Typing "cancel" (the escape function) or not replying in time both
// abort the whole flow by throwing a CANCELLED error.
async function awaitReply(user, promptText) {
  await user.send(promptText);
  const channel = user.dmChannel ?? await user.createDM();

  let collected;
  try {
    collected = await channel.awaitMessages({
      filter: m => m.author.id === user.id,
      max: 1,
      time: 120_000,
      errors: ['time']
    });
  } catch {
    await user.send("You didn't reply in time. Cancelled.");
    throw new Error('CANCELLED');
  }

  const reply = collected.first().content.trim();
  if (reply.toLowerCase() === 'cancel') {
    await user.send('Cancelled.');
    throw new Error('CANCELLED');
  }
  return reply;
}

async function notifySacaetw(text) {
  try {
    const sacaetw = await client.users.fetch(SACAETW_ID);
    await sacaetw.send(text);
  } catch (err) {
    console.log("Couldn't notify sacaetw", err);
  }
}

// Shows a preview with Send/Edit/Cancel buttons. Edit opens a modal
// pre-filled with the current text and loops back to a fresh preview.
// Send posts to the announcement channel and, if saveKey is given,
// saves the (possibly edited) text under that name for later resending.
async function previewThenSend(user, text, saveKey) {
  while (true) {
    const sendBtn = new ButtonBuilder().setCustomId('confirmSend')
      .setLabel('Send').setStyle(ButtonStyle.Success);
    const editBtn = new ButtonBuilder().setCustomId('editSend')
      .setLabel('Edit').setStyle(ButtonStyle.Primary);
    const cancelBtn = new ButtonBuilder().setCustomId('cancelSend')
      .setLabel('Cancel').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(sendBtn, editBtn, cancelBtn);

    const previewMsg = await user.send({
      content: `Here's a preview of what will be sent:\n\n${text}`,
      components: [row]
    });

    let confirmation;
    try {
      confirmation = await previewMsg.awaitMessageComponent({
        filter: i => i.user.id === user.id,
        time: 60_000
      });
    } catch {
      await user.send("You didn't respond in time. Cancelled.");
      return;
    }

    if (confirmation.customId === 'cancelSend') {
      await confirmation.deferUpdate();
      await user.send('Cancelled. Nothing was sent.');
      return;
    }

    if (confirmation.customId === 'editSend') {
      const modal = new ModalBuilder().setCustomId('editModal').setTitle('Edit message');
      const input = new TextInputBuilder().setCustomId('editedText')
        .setLabel('Message').setStyle(TextInputStyle.Paragraph)
        .setValue(text).setMaxLength(4000);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await confirmation.showModal(modal);

      try {
        const submitted = await confirmation.awaitModalSubmit({
          filter: i => i.user.id === user.id,
          time: 300_000
        });
        await submitted.deferUpdate();
        text = submitted.fields.getTextInputValue('editedText');
      } catch {
        await user.send("Edit timed out. Here's the preview again.");
      }
      continue; // show the (possibly updated) preview again
    }

    // confirmSend
    await confirmation.deferUpdate();
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    await channel.send(text);
    await user.send('Sent!');

    if (saveKey) {
      saveAnnouncement(saveKey, text);
    }
    if (user.id !== SACAETW_ID) {
      await notifySacaetw(`${user.globalName} just sent:\n\n${text}`);
    }
    return;
  }
}

async function cancelTourney(user){
  const tourney = await awaitReply(user, "What's the name of the tournament being cancelled?");
  const text = `${tourney} is cancelled for this week`;
  await previewThenSend(user, text, tourney.toLowerCase());
}
async function potBonus(user){
  const tourney = await awaitReply(user, "What's the name of the tournament?");
  const amount = await awaitReply(user, "How much is the pot bonus?");
  const link = await awaitReply(user, "What's the link to the tournament?");
  const text = `${tourney} HAS A $${amount} POT BONUS THIS WEEK. REGISTER HERE: ${link}`;
  await previewThenSend(user, text, tourney.toLowerCase());
}
async function announceTourney(user){
  const tourney = await awaitReply(user, "What's the name of the tournament?");
  const link = await awaitReply(user, "What's the link?");
  const text = `We have ${tourney} this week! Pre-register here: ${link}`;
  await previewThenSend(user, text, tourney.toLowerCase());
}
async function postClip(user){
  const link = await awaitReply(user, "What's the link to the clip?");
  const text = `Check out this clip: ${link}`;
  await previewThenSend(user, text);
}
async function misc(user){
  const text = await awaitReply(user, "What message would you like to send?");
  await previewThenSend(user, text);
}

async function resendAnnouncement(user){
  const store = loadJson(ANNOUNCEMENTS_FILE);
  const names = Object.keys(store);
  if (names.length === 0) {
    await user.send("Nothing's been sent yet, so there's nothing to resend.");
    return;
  }

  const requested = await awaitReply(user, `Which one would you like to resend? (${names.join(', ')})`);
  const key = requested.trim().toLowerCase();
  const text = store[key];
  if (!text) {
    await user.send(`I don't have anything saved for "${requested}".`);
    return;
  }
  await previewThenSend(user, text, key);
}

async function enableWeeklyReminder(user){
  const store = loadJson(ANNOUNCEMENTS_FILE);
  const names = Object.keys(store);
  if (names.length === 0) {
    await user.send("Nothing's been announced yet, so there's nothing to set a weekly reminder for. Announce it once first, then set up the reminder.");
    return;
  }

  const requested = await awaitReply(user, `Which tournament should I check in about each week? (${names.join(', ')})`);
  const key = requested.trim().toLowerCase();
  if (!store[key]) {
    await user.send(`I don't have anything saved for "${requested}". Announce it once first, then set up the reminder.`);
    return;
  }

  const dayInput = (await awaitReply(user, "What day of the week should I check in? (e.g. Thursday)")).trim().toLowerCase();
  const dayOfWeek = DAY_NAMES.indexOf(dayInput);
  if (dayOfWeek === -1) {
    await user.send(`I didn't recognize "${dayInput}" as a day of the week. Cancelled.`);
    return;
  }

  const hourInput = await awaitReply(user, "What hour should I check in, 0-23 (the bot's server local time)?");
  const hour = parseInt(hourInput, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    await user.send(`I didn't understand "${hourInput}" as an hour 0-23. Cancelled.`);
    return;
  }

  const reminders = loadJson(REMINDERS_FILE);
  reminders[key] = { enabledBy: user.id, dayOfWeek, hour, lastFiredAt: 0 };
  saveJson(REMINDERS_FILE, reminders);
  await user.send(`Got it. I'll check in about "${key}" every ${DAY_NAMES[dayOfWeek]} at ${hour}:00 (server time).`);
}

// Runs every minute. Fires at most once per ~week per tournament, and
// only for the user who enabled that reminder.
async function checkWeeklyReminders(){
  const reminders = loadJson(REMINDERS_FILE);
  const now = new Date();

  for (const [name, config] of Object.entries(reminders)) {
    if (now.getDay() !== config.dayOfWeek || now.getHours() !== config.hour) continue;
    if (Date.now() - config.lastFiredAt < WEEK_MS) continue;

    config.lastFiredAt = Date.now();
    reminders[name] = config;
    saveJson(REMINDERS_FILE, reminders);

    try {
      const user = await client.users.fetch(config.enabledBy);
      await runWeeklyCheckIn(user, name);
    } catch (err) {
      console.log("Weekly reminder failed", name, err);
    }
  }
}

async function runWeeklyCheckIn(user, name){
  const yesBtn = new ButtonBuilder().setCustomId('reminderYes').setLabel('Yes').setStyle(ButtonStyle.Success);
  const noBtn = new ButtonBuilder().setCustomId('reminderNo').setLabel('No').setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(yesBtn, noBtn);

  const promptMsg = await user.send({
    content: `Is **${name}** happening this week?`,
    components: [row]
  });

  let confirmation;
  try {
    confirmation = await promptMsg.awaitMessageComponent({
      filter: i => i.user.id === user.id,
      time: 3600_000 // an hour to answer
    });
  } catch {
    await user.send(`Didn't hear back about ${name} — skipping this week.`);
    return;
  }
  await confirmation.deferUpdate();

  const store = loadJson(ANNOUNCEMENTS_FILE);
  if (confirmation.customId === 'reminderYes') {
    await previewThenSend(user, store[name], name);
  } else {
    await previewThenSend(user, `${name} is cancelled for this week`, name);
  }
}

//Message functions
async function intro(user) {
  await user.send
  (`Hello, ${user.globalName}.` +
  " I can help you announce to the local Minnesotan smash discords!");

  const cancelTourneyBtn = new ButtonBuilder().setCustomId('cancelTourney')
    .setLabel('Cancel a Tourney').setStyle(ButtonStyle.Danger);

  const potBonusBtn = new ButtonBuilder().setCustomId('potBonus')
    .setLabel('Set a pot bonus').setStyle(ButtonStyle.Success);

  const miscBtn = new ButtonBuilder().setCustomId('misc')
    .setLabel('Misc').setStyle(ButtonStyle.Secondary);

  const announceBtn = new ButtonBuilder().setCustomId('announce')
    .setLabel('Announce a Tourney').setStyle(ButtonStyle.Primary);

  const clipBtn = new ButtonBuilder().setCustomId('clip')
    .setLabel('Post a clip').setStyle(ButtonStyle.Primary);

  const resendBtn = new ButtonBuilder().setCustomId('resend')
    .setLabel('Resend').setStyle(ButtonStyle.Secondary);

  const weeklyBtn = new ButtonBuilder().setCustomId('weeklyReminder')
    .setLabel('Set up weekly reminder').setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(announceBtn, potBonusBtn,
    cancelTourneyBtn, clipBtn, miscBtn);
  const row2 = new ActionRowBuilder().addComponents(resendBtn, weeklyBtn);

  const menuMsg = await user.send({
    content:"What message would you like to send?",
    components: [row1, row2]
  });

  let confirmation;
  try {
    confirmation = await menuMsg.awaitMessageComponent({
      filter: i => i.user.id === user.id,
      time: 60_000
    });
  } catch {
    await user.send("You didn't respond in time. Cancelled.");
    return;
  }

  await confirmation.deferUpdate();

  if(confirmation.customId==='cancelTourney'){
    await cancelTourney(user);
  }
  else if(confirmation.customId==='potBonus'){
    await potBonus(user);
  }
  else if(confirmation.customId==='announce'){
    await announceTourney(user);
  }
  else if(confirmation.customId==='clip'){
    await postClip(user);
  }
  else if(confirmation.customId==='misc'){
    await misc(user);
  }
  else if(confirmation.customId==='resend'){
    await resendAnnouncement(user);
  }
  else if(confirmation.customId==='weeklyReminder'){
    await enableWeeklyReminder(user);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (activeFlows.has(message.author.id)) return; // mid-flow reply, let the collector handle it

  if(MN_TO_IDs.includes(message.author.id) && message.guild === null) {
    activeFlows.add(message.author.id);
    try {
        await intro(message.author);
    }
    catch(err) {
      if (err.message !== 'CANCELLED') {
        console.log("Error Occurred", err);
      }
    }
    finally {
      activeFlows.delete(message.author.id);
    }
  }
  else {
    try {
        await message.author.send(
          "Unfortunately, you are not considered a MN TO by the system. " +
          "Contact sacaetw on Discord so that he can add you to the system!"
        );
    }
    catch {
      console.log("Error Occurred");
    }
  }
})
