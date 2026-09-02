import dotenv from "dotenv";
dotenv.config();

import {Client, GatewayIntentBits, Message, Partials, ButtonBuilder, 
  ButtonStyle, ActionRowBuilder, SlashCommandBuilder

} from 'discord.js';

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
  // Add any stats person
};
let MN_TO_IDs=Object.keys(MN_TOs);

async function cancelTourney(){

}
async function potBonus(){

}
async function announceTourney(){

}
async function misc(){

}

//Message functions
async function intro(message) {
  await message.author.send
  (`Hello, ${message.author.globalName}.` +
  " I can help you announce to the local Minnesotan smash discords!");

  const cancelTourney = new ButtonBuilder().setCustomId('cancelTourney')
    .setLabel('Cancel a Tourney').setStyle(ButtonStyle.Danger);

  const potBonus = new ButtonBuilder().setCustomId('potBonus')
    .setLabel('Set a pot bonus').setStyle(ButtonStyle.Success);

  const misc = new ButtonBuilder().setCustomId('misc')
    .setLabel('Misc').setStyle(ButtonStyle.Secondary);

  const announce = new ButtonBuilder().setCustomId('announce')
    .setLabel('Announce a Tourney').setStyle(ButtonStyle.Primary);
  
  const row = new ActionRowBuilder().addComponents(announce, potBonus, 
    cancelTourney, misc);

  await message.author.send({ 
    content:"What message would you like to send?",
    components: [row] ,
    withResponse: true
  });
  const collectorFilter = (i) => i.user.id === interaction.user.id;
  const confirmation = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
  if(confirmation.customId==='cancelTourney'){
    cancelTourney();
  }
  else if(confirmation.customId==='potBonus'){
    potBonus();
  }
  else if(confirmation.customId==='announce'){
    announceTourney();
  }
  else if(confirmation.customId==='misc'){
    misc();
  }

}
client.on("messageCreate", async (message) => {
  if(MN_TO_IDs.includes(message.author.id) && message.guild===null) {
    try {
        await intro(message);
        
        // ask if they want to announce a pot bonus for the event, want to input
        // a different event name, announce a cancellation, announce something
        // miscellaneous
        // then put a preview, then put a yes or no, then print it out in 10 min
    }
    catch(err) {
      console.log("Error Occurred", err);
    }
  }
  else {
    try {
        await message.author.send (
          `Hello ${message.author.globalName}. Unfortunately, you are not a 
          listed tournament organizer within our database. If you would like to
          be recognized as a TO, I can send a recognition request to the head 
          developer.`
          //Add yes or no button here. Then ask SACAETW for permission.
        );
    }
    catch {
      console.log("Error Occurred")
    }
  }
})

