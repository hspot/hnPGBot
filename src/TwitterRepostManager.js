var logger = require ('./utils.js');
var config = require('../config.json');
const Discord = require('discord.js');
var Twitter = require('twitter');

class TwitterRepostManager {
    constructor(discordBot) {
        this.discordBotClient = discordBot; 
        this.stream = null; 
        this.client = null;
    }

    start() {    
        if(this.client === null){
            this._initTwitterClient();
        }

        logger.log(`Twitter: Activating stream for follow: ${config.TwitterIdsToFollow}`);
        this.stream = this.client.stream('statuses/filter', {follow: config.TwitterIdsToFollow});

        this.stream.on('data', (event) => {            
            logger.debug(event);
            let shouldSendTweet = true;

            if(config.KeepOriginalTweetOnly)            {
                var followUserIds = config.TwitterIdsToFollow.split(',');
                if(!followUserIds.includes(event.user.id_str) 
                    || event.in_reply_to_status_id_str !== null
                    || event.in_reply_to_user_id_str !== null) { // not original                    
                    shouldSendTweet = false;
                    logger.debug(`replystatus: ${event.user.id_str}|${event.in_reply_to_status_id_str}|${event.in_reply_to_user_id_str}`)
                }
            } 
            if(config.RemoveTweetWithTags) { 
                if(event.text.indexOf('@') >= 0) { // have tag
                    shouldSendTweet = false;
                    logger.debug(`text tag: ${event.text}`);
                }                        
            }

            if(shouldSendTweet){
                this._sendTweetToDiscord(event);
            }            
        });

        this.stream.on('error', function(error) {
            logger.log(error);
        });
    }

    stop() {
        this.stream.destroy();
        this.stream = null; 
        logger.log('Stream destroyed.');
    }

    _initTwitterClient(){
        this.client = new Twitter({
            consumer_key: config.TwitterBotKey,
            consumer_secret: config.TwitterBotSecret,
            access_token_key: config.TwitterBotToken,
            access_token_secret: config.TwitterBotTokenSecret            
        });    
    }
    
    _sendTweetToDiscord(tweet){
        var discordMessageText = `${tweet.text}\r\n${this._getUrlForTweet(tweet)}`;
        var channel = this.discordBotClient.channels.get(config.DiscordChannelIdToDeliverTweets);
        channel.send(discordMessageText);
        logger.log(`TWEET ${tweet.id_str} DELIVERING TO DISCORD: ${discordMessageText}`);
    }

    _getUrlForTweet(tweet){
        if(tweet.text.indexOf('http') >= 0) { // has a link already
            return '';
        }
        return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
    }
}

module.exports = TwitterRepostManager;