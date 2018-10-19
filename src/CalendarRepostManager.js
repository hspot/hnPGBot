var config = require('../config.json');
const Discord = require("discord.js");
var logger = require ('./utils.js');
const util = require('util');
let {google} = require('googleapis');
let privatekey = require(config.GoogleApiPrivateKeyPath);
var isSameDay = require('date-fns/is_same_day');
var format = require('date-fns/format');
var subMinutes = require('date-fns/sub_minutes');
var subDays = require('date-fns/sub_days');
var isSameHour = require('date-fns/is_same_hour');
var lastDayOfWeek = require('date-fns/last_day_of_week');

/* Sync Calendar events to Discord */
class CalendarRepostManager {
    constructor(bot, postSettings) {
        this.discordBot = bot;        
        this.postSettings = postSettings[0];
        this.jwtClient = null;
        this.recurringEventIds;
    }

    init(){
        // configure a JWT auth client
        this.jwtClient = new google.auth.JWT(
            privatekey.client_email,
            null,
            privatekey.private_key,
            ['https://www.googleapis.com/auth/calendar']);

        //authenticate request
        this.jwtClient.authorize(function (err, tokens) {
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("Google Calendar API: Successfully connected!");
            }
        });
    }

    // Post calendar events to a message (likely on an interval)
    postCalendarEvents() {   
        const calendar = google.calendar({version: 'v3', auth: this.jwtClient});

        calendar.events.list({
            //auth: this.jwtClient,
            calendarId: this.postSettings.calendarId, //primary
            timeMin: (new Date()).toISOString(),
            maxResults: this.postSettings.numberOfEventsToPost,
            singleEvents: true,
            orderBy: 'startTime',
        }, (err, result) => {
            if (err) return console.log('The API returned an error: ' + err);
            this._postEventToDiscord(result.data.items);        
        });
    }     

    _postEventToDiscord(events) {        
        if (events.length) { 
            let eventContent = '**POGO EVENT SCHEDULE**\n\n';  
            //logger.log(events);

            this.recurringEventIds = [];
            events.map((event, i) => {
                let normalizedDates = this._getNormalizedDates(event);

                if(!this._isSubsequentRecurringEvent(normalizedDates)) { // subsequent recurring events are ignored               
                    let startDate = normalizedDates.startDate;
                    let endDate = normalizedDates.endDate;                

                    let dateStr = '';    
                    if(isSameDay(startDate, endDate)) { // same day
                        if(normalizedDates.isAllDay){ // all day
                            dateStr = util.format('%s%s', format(startDate, 'M/D'), this._getTimeDisplay(startDate));           
                        } else { // have time component
                            if(isSameHour(startDate, endDate)) {
                                dateStr = util.format('%s%s', format(startDate, 'M/D'), this._getTimeDisplay(startDate));
                            } else {
                                dateStr = util.format('%s%s -%s', format(startDate, 'M/D'), this._getTimeDisplay(startDate), this._getTimeDisplay(endDate));
                            }
                        }
                    } else { // different days
                        dateStr = util.format('%s%s - %s%s', format(startDate, 'M/D'), this._getTimeDisplay(startDate),
                            format(endDate, 'M/D'), this._getTimeDisplay(endDate));
                    }                                                                 

                    eventContent += `:white_medium_small_square:__**${dateStr}**__: _${event.summary}_ \n`;
                }
            });

            let channel = this.discordBot.channels.get(this.postSettings.channelId);
            if(channel) {
                channel.fetchMessage(this.postSettings.messageId)
                .then(message => {
                    message.edit(eventContent)
                    .then(msg => console.log(`Post calendar content: ${msg}`))
                    .catch(console.error);
                })
                .catch(console.error);
            }
        } else {
            console.log('No upcoming events found.');
        }
    }

    _isSubsequentRecurringEvent(normalizedDate) {
        let isSubsequentRecurringEvent = false;
        if(normalizedDate.recurringEventId){
            if(this.recurringEventIds.includes(normalizedDate.recurringEventId)){
                isSubsequentRecurringEvent = true;
            } else {
                this.recurringEventIds.push(normalizedDate.recurringEventId);
            }
        }

        return isSubsequentRecurringEvent;
    }

    _getTimeDisplay(date) {
        let timeStr = '';        

        if(date.getMinutes() != 0){
            timeStr = util.format(' %s', format(date, 'h:mmA'));
        }
        else if(date.getHours() != 0){ // only has hour
            timeStr = util.format(' %s', format(date, 'hA'));
        }

        return timeStr;
    }

    _getNormalizedDates(event){
        let normalizedStartDate;
        let normalizedEndDate;
        let isAllDay = false;
        if(event.start.dateTime ) { // with specified time
            normalizedStartDate = new Date(event.start.dateTime);
            normalizedEndDate = new Date(event.end.dateTime);
            let timezoneOffset = 360; // for Central Time
            if(this._isInDaylightSaving()){
                logger.log("In Daylight Saving");
                timezoneOffset = 300;
            }
            // console.log(`tz: ${timezoneOffset}`); - prod 0
            if(!config.IsDebug){ // PROD - quick fix for timezone
                normalizedStartDate = subMinutes(normalizedStartDate, timezoneOffset);
                normalizedEndDate = subMinutes(normalizedEndDate, timezoneOffset);
            }

        } else { // all - day event
            let startDateStr = util.format('%sT00:00:00', event.start.date);
            let endDateStr = util.format('%sT00:00:00', event.end.date);
            normalizedStartDate = new Date(startDateStr);
            normalizedEndDate = subDays(new Date (endDateStr), 1);
            isAllDay = true;
        }

        //logger.debug(`=${i}= `+ startDateStr+'|'+startDate+'|'+endDateStr+'|'+endDate);

        return { startDate: normalizedStartDate, endDate: normalizedEndDate, isAllDay: isAllDay,
            recurringEventId: event.recurringEventId };
    }

    _isInDaylightSaving()
    {
        var currentDate = new Date();
        var secondSundayOfMarchDate = lastDayOfWeek(new Date(currentDate.getFullYear(), 2, 8, 0, 0, 0), {weekStartsOn: 1});
        var firstSundayOfNovemberDate = lastDayOfWeek(new Date(currentDate.getFullYear(), 10, 1, 0, 0, 0), {weekStartsOn: 1});

        var currentDateTimeValue = currentDate.getTime();
        return currentDateTimeValue >= secondSundayOfMarchDate.getTime() && currentDateTimeValue <= firstSundayOfNovemberDate.getTime();
    }

    _nofityOnError(error){
        console.error(error);
        //message.reply("Calendar sync failed").catch(console.error);    
    }

    // _getCalendarEvents(numberOfEvents) {
    //     let calendar = google.calendar('v3');
    //     calendar.events.list({
    //         auth: this.jwtClient,
    //         calendarId: 'primary'
    //     }, function (err, response) {
    //         if (err) {
    //             console.log('The API returned an error: ' + err);
    //             return;
    //         }
            
    //         var events = response.items;
    //         if (events.length == 0) {
    //             console.log('No events found.');
    //         } else {
    //             console.log('Event from Google Calendar:');
    //             for (let event of response.items) {
    //                 console.log('Event name: %s, Creator name: %s, Create date: %s', event.summary, event.creator.displayName, event.start.date);
    //             }
    //         }
    //     });
    // }

    // test(auth) {

    //     const calendar = google.calendar({version: 'v3', auth});

    //     //console.log(calendar.calendars);
    //     //console.log(calendar.calendarList);
    //     calendar.calendarList.list({ 
    //     }, (err, {data}) => {
    //         if (err) return console.log('The API returned an error: ' + err);
    //         console.log(data);
    //         // if (events.length) {
    //         //     console.log('Upcoming 10 events:');
    //         //     events.map((event, i) => {
    //         //     const start = event.start.dateTime || event.start.date;
    //         //     console.log(`${start} - ${event.summary}`);
    //         // });
    //         // } else {
    //         //     console.log('No upcoming events found.');
    //         // }
    //     });
    //   }
}

module.exports = CalendarRepostManager;