const Discord = require("discord.js");
var logger = require ('./utils.js');
var DiscordTeamRoleManager = require('./DiscordTeamRoleManager.js');
// var TwitterRepostManager = require('./TwitterRepostManager');
// var DiscordMessagePruner = require('./DiscordMessagePruner');

class DiscordServerManager {
    constructor(discordBot, twitterRepostManager, discordMessagePruner, calendarRepostManager) {
        this.discordBot = discordBot;
        this.twitterRepostManager = twitterRepostManager;
        this.discordTeamRoleManager = new DiscordTeamRoleManager(discordBot);  
        this.discordMessagePruner = discordMessagePruner;
        this.calendarRepostManager = calendarRepostManager;
    }
    
    start() {
        logger.log(`Discord: Activating message listen.`);
        // Event to listen to messages sent to the server where the bot is located
        this.discordBot.on('message', message => {
            // So the bot doesn't reply to iteself
            if (message.author.bot) return;
                    
            // Check if the message starts with the `!` trigger
            if (message.content.indexOf('!') === 0) {
                // Get the user's message excluding the `!`
                var command = message.content.substring(1);

                switch(command)
                {                    
                    case 'debug':
                        message.reply("Done!");
                        //this.debugMessage(message);
                        this.debugServer();
                        break;
                    case 'restartTwitterBot':
                    case 'rtb':
                        this.restartTwitterBot(message);
                        break;
                    case 'pm':
                    case 'pruneMessages':
                        this.discordMessagePruner.pruneMessages();
                        break;
                    case 'cp':
                    case 'calenderPost':
                        this.calendarRepostManager.syncCalendarEvents();
                        break; 
                    default:
                        this.discordTeamRoleManager.processCommand(command, message);
                        this.discordMessagePruner.processCommand(command, message);
                        break;
                }        
            }
        });
    }
    
    restartTwitterBot(message) {
        this.twitterRepostManager.stop();
        this.twitterRepostManager.start();
        message.reply('Twitter Bot restarted.').catch(console.error);
    }

    debugMessage(message) {
        // message.member.roles.forEach(element => {
        //    logger.log(element);
        // });
        
        //logger.log(message.channel);
        //logger.log(message);

        let messages = message.channel.fetchMessages({ limit: 10 })
            .then(messages => {
                console.log(messages);
            });
    }

    debugServer(){
        logger.log(this.discordBot.guilds); // 334767374358020097
    }
}

module.exports = DiscordServerManager;