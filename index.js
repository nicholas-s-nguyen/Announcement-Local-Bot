import dotenv from "dotenv";
dotenv.config();

import {Client, GatewayIntentBits} from 'discord.js';

// Takes an arry of intents for data
// you want access too
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

//can use the client to listen to events
client.login(process.env.DISCORD_TOKEN);

function is_person(message, person){
  return message.author.id === person;
}

let MN_TOs ={"grizhawk": "375118870685679616",
  "bigwill": "119592871962607616",
  "tegnarr": "434840414919458837",
  "carrfam": "319530432200966145",
  "trippybutter": "199010608270671873",
  "blrasmu": "251072067036905472",
  "definitlyalex": "702696795037368320",
  "kingfailbot": "189182425094422528",
  "coachpauly": "269311308283904001",
  "fennix2001": "218546120924594189",
  "nitt_": "152561799806320641",
  "coachnuke": "943223437055369256",
  "quank64": "265248669425467392",
  "roan.png": "290133019958837249",
  "sacaetw": "285129459692994561",
  "ori0n_ssb": "145720538755629056",
  "a_n": "247867927863361536",
  "studentx": "393913625267404818",
  "senam": "305526520162811907",
  "sunsteel": "348645042249793537",
  "blazek114": "269627584621445122",
  "glasshalfemtea": "190239922848792576",
  "themustacheman39": "477216523354898442",
  "beetlethe": "1037860266798493716"
};
let MN_TO_IDs=Object.values(MN_TOs);

client.on("messageCreate", async (message) => {
  if(MN_TO_IDs.includes(message.author.id) && 
  message.guild===null) {
  message.author.send('Hello eery');
  }
})

