const Discord = require("discord.js");
var logger = require ('./utils.js');

class DiscordMessagePruner {
    constructor(bot, pruneSetting) {
        this.discordBot = bot;

        //{ channelId: '425994018866987008', commandTag: 'trade', messageAgeToPruneInMinutes: 20}
        this.pruneChannelsMatrix = pruneSetting;
    }    

    // Prune messages of the channels (likely on an interval)
    pruneMessages() {
        this.pruneChannelsMatrix.forEach(pruneItem => {
           let channel = this.discordBot.channels.get(pruneItem.channelId);
           if(channel) {
               this._pruneChannel(channel, pruneItem);
           }
        });       
    }

    // Process each message that might be sent to the registered channels
    processCommand(command, message) {
        // So the bot doesn't reply to iteself
        if (message.author.bot) return;

        command = this._normalizeCommand(command);
    
        let hasError = false;

        this.pruneChannelsMatrix.forEach(item =>  {
            logger.log(`${message.channel.id} ${item.channelId} ${command} ${item.commandTag}`);
            if(message.channel.id === item.channelId && command === item.commandTag) {
                //TODO : search for another pinned message from the same user and unpinned it
                // this._findPinnedMessagesOfUser(message).then(otherPinnedMessages => {
                //     message.pin().catch((error) => {
                //         this._handleMessageError(error, message);
                //         hasError = true;
                //     }).then(() => {
                //         let responseText = `Got it! Your post has been pinned and saved.`;
                //         logger.log(otherPinnedMessages);
                //         logger.log(`3: size ${otherPinnedMessages.size}`);
                //         if(otherPinnedMessages.size > 0){
                //             responseText += " You can only have 1 saved post. Your other saved post will be removed soon.";
                //             otherPinnedMessages.forEach(message => message.unpin());
                //         }
                //         this._messageResultToUser(hasError, responseText, message);
                //     });
                // } );           
                
                // message.pin().catch((error) => {
                //     this._handleMessageError(error, message);
                //     hasError = true;
                // }).then(() => {
                //     let responseText = `Got it! Your post has been saved.`;                    
                //     this._messageResultToUser(hasError, responseText, message);
                // }); 
               
                let responseText = `Got it! Your post with this !${item.commandTag} command will be saved.`;                    
                this._messageResultToUser(hasError, responseText, message); 
            }
        });
    }

    _pruneChannel(channel, pruneSetting) {
        channel.fetchMessages({ limit: 100 })
        .then(messages => {
            console.log(`Pruning total of ${messages.size} messages.`);

            messages.forEach(message => {      
                if(!message.pinned && !this._isCommandedMessage(message.content, pruneSetting)){
                    // milisecond timestamp of when message could be prune.    
                    let timeStampToPrune = message.createdTimestamp + (1000 * 60 * pruneSetting.messageAgeToPruneInMinutes);
                    if(message.system){
                        this._deleteMessage(message);
                    }
                    else if(message.author.bot){
                        this._deleteMessage(message);
                    }
                    else if(new Date().getTime() > timeStampToPrune){
                        this._deleteMessage(message);
                    }
                }
            });
        })
        .catch(console.error);
    }

    _isCommandedMessage(messageText, pruneSetting) {
        let isCommandedMessage = false;

        if (messageText.indexOf('!') === 0) {
            // Get the user's message excluding the `!`
            var command = messageText.substring(1);
            command = this._normalizeCommand(command);
            isCommandedMessage = command === pruneSetting.commandTag;
        }

        return isCommandedMessage;
    }

    _deleteMessage(message){
        message.delete();
        console.log(`Pruned ${message.id}: ${message.content.substring(0, 30)}`);
    }

    async _findPinnedMessagesOfUser(message){
        // message.channel.fetchPinnedMessages().then(messages => {
        //     console.log(`Command: Number of pinned messages ${messages.size}.`);
        //     let pinnedMessagesOfUser = messages.filter(pinnedMessage => pinnedMessage.author.id == message.author.id);
        //     console.log(pinnedMessagesOfUser);
        //     return pinnedMessagesOfUser;
        // }).catch(console.error);

        let messages = await message.channel.fetchPinnedMessages();
        console.log(`Command: Number of pinned messages ${messages.size}.`);
        let pinnedMessagesOfUser = messages.filter(pinnedMessage => pinnedMessage.author.id == message.author.id);
        //console.log(pinnedMessagesOfUser);
        return pinnedMessagesOfUser;
    }

    _messageResultToUser(hasError, successfulMessage, message) {        
        if(!hasError) {
           message.reply(successfulMessage).catch(console.error);
        }
    }
    
    _handleMessageError(error, message){
        console.error(error); 
        message.reply("Opps. That didn't work. Tag hspot so he fixes his bad code!").catch(console.error);    
    }

    _normalizeCommand(command){
        command = this._substringIfFound(command, "\n");
        command = this._substringIfFound(command, " ");
        command = command.toLowerCase().trim();

        return command;
    }

    _substringIfFound(text, searchChar){
        let indexOfChar = text.indexOf(searchChar);
        if(indexOfChar > 0) {
            text = text.substr(0, indexOfChar);
        }

        return text;
    }
}

module.exports = DiscordMessagePruner;