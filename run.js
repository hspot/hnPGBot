var config = require('./config.json');
var logger = require ('./src/utils.js');
const Discord = require('discord.js');
const DiscordServerManager = require ('./src/DiscordServerManager');
const TwitterRepostManager = require('./src/TwitterRepostManager');
const DiscordMessagePruner = require('./src/DiscordMessagePruner');
const CalendarRepostManager = require('./src/CalendarRepostManager');

const discordBotClient = new Discord.Client();

// Gets called when our bot is successfully logged in and connected
discordBotClient.on('ready', () => {
    logger.log('hnLG bot on!');
});
if(config.IsDiscordBotOn){
    logger.log('Discord: Logging in with token:' + config.DiscordBotToken[0] + '...' + config.DiscordBotToken.substring(config.DiscordBotToken.length - 3));
    discordBotClient.login (config.DiscordBotToken);
}

var twitterRepostManager = new TwitterRepostManager(discordBotClient);
if(config.IsTwitterRepostOn) {    
    twitterRepostManager.start();
}

var numberOfMinsBeforeTwitterBotRestart = parseInt(config.TwitterStreamRestartIntervalInMinutes);
if(config.IsTwitterRepostOn && numberOfMinsBeforeTwitterBotRestart > 0) {
    setInterval(restartTwitterBot, numberOfMinsBeforeTwitterBotRestart * 60 * 1000);
    logger.log(`Restarting Twitter Bot every ${numberOfMinsBeforeTwitterBotRestart} mins.`);
}

let pruneSettings = eval(config.MessagePruneSettings);
let discordMessagePruner = new DiscordMessagePruner(discordBotClient, pruneSettings);
var numberOfMinsBeforeMessagePrune = parseInt(config.DiscordMessagePruneIntervalInMinutes);
if(numberOfMinsBeforeMessagePrune > 0) {    
    logger.log(`Prune Discord messages every ${numberOfMinsBeforeMessagePrune} mins with settings: `);
    console.log(pruneSettings);
    setInterval(pruneDiscordMessages, numberOfMinsBeforeMessagePrune * 60 * 1000);
}

let calendarPostSettings = eval(config.CalendarPostSettings);
let calendarRepostManager = new CalendarRepostManager(discordBotClient, calendarPostSettings);
var numberOfMinsBeforeCalendarPost = parseInt(config.CalendarPostIntervalInMinutes);
if(numberOfMinsBeforeCalendarPost > 0) {
    logger.log(`Google calendar post every ${numberOfMinsBeforeCalendarPost} mins with settings: `);
    console.log(calendarPostSettings);
    calendarRepostManager.init();
    setInterval(postCalendarEvents, numberOfMinsBeforeCalendarPost * 60 * 1000);
}

var discordServerManager = null;
if(config.IsTeamRoleManagerOn) {
    discordServerManager = new DiscordServerManager(discordBotClient, twitterRepostManager, discordMessagePruner, 
        calendarRepostManager);
    discordServerManager.start();
}

function pruneDiscordMessages()
{
    discordMessagePruner.pruneMessages();
}

function postCalendarEvents(){
    calendarRepostManager.postCalendarEvents();
}

function restartTwitterBot() {
    twitterRepostManager.stop();
    twitterRepostManager.start();
    logger.log("Twitter Bot restarted.");
}
