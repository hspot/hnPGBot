const Discord = require("discord.js");
var logger = require ('./utils.js');

class DiscordTeamRoleManager {
    constructor(bot) {
        this.discordBot = bot;       

        this.teamRoleMatrix = [ { name: 'Instinct', id: '425994018866987008' },
            { name: 'Mystic', id: '425994278398066698' },
            { name: 'Valor', id: '425994706233589760' },
            { name: 'Harmony', id: '427256977891131392' }           
        ];

        this.raidGroupRoleMatrix = [ { name: 'Shiny-Hunters', id: '448504579382968330' },
            { name: 'Lunch-Raiders', id: '448508793316442114' },
            { name: 'EX-Raiders', id: '448509065354805248' }
        ];
    }
    
    processCommand(command, message) {
        // So the bot doesn't reply to iteself
        if (message.author.bot) return;
            
        let teamTagline = null;
        let teamRoleNameToUpdate = null;

        command = command.toLowerCase();

        switch(command)
        {
            case 'instinct':                                
                teamTagline = "We never lose when we trust our instincts!";
                this.updateTeamRole("Instinct", message, teamTagline);
                break;
            case 'mystic':
                teamTagline = "With our calm analysis of every situation, we can't lose!";
                this.updateTeamRole("Mystic", message, teamTagline);
                break;
            case 'valor':
                teamTagline = "There's no doubt that the Pokémon our team has trained are the strongest in battle!";
                this.updateTeamRole("Valor", message, teamTagline);
                break;
            case 'harmony':
                teamTagline = "Our Great Guardian shall arise to quell the fighting!";
                this.updateTeamRole("Harmony", message, teamTagline);
                break;
            case 'shiny-hunt':
                this.updateRaidGroupRole("Shiny-Hunters", message);
                break;
            case 'lunch-raid':
                this.updateRaidGroupRole("Lunch-Raiders", message);
                break;    
            case 'ex-raid':
                this.updateRaidGroupRole("EX-Raiders", message);
                break;
            case 'shiny-hunters':
                this.showRaidGroupMembers("Shiny-Hunters", message);
                break;
            case 'lunch-raiders':
                this.showRaidGroupMembers("Lunch-Raiders", message);
                break;
            case 'ex-raiders':
                this.showRaidGroupMembers("EX-Raiders", message);
                break;
        }
    }

    updateTeamRole(teamRoleNameToUpdate, message, teamTagline) {       
        if(teamRoleNameToUpdate !== null) {                    
            let hasError = false;

            let roleIdToChangeTo = this.teamRoleMatrix.find((team) => team.name === teamRoleNameToUpdate).id;

            console.log(`roleIdToChange: ${roleIdToChangeTo}`);
            if(message.member.roles.some(o => o.id === roleIdToChangeTo)) { // non team already - revoming
                message.member.removeRole(roleIdToChangeTo).catch((error) => {
                    this.handleMessageError(error, message);
                    hasError = true;
                }).then(() => {
                    let responseText = `Okkkk. You are no longer a part of the cool Team ${teamRoleNameToUpdate}!`;
                    this.messageResultToUser(hasError, responseText, message);
                });                                           
            }
            else { // not on team - adding
                message.member.addRole(roleIdToChangeTo).catch((error) => {
                    this.handleMessageError(error, message);
                    hasError = true; 
                }).then(() => {
                    this.removeOldTeamRoles(teamRoleNameToUpdate, this.teamRoleMatrix, message);
                    let responseText = `Welcome to Team ${teamRoleNameToUpdate}. ${teamTagline}`;
                    this.messageResultToUser(hasError, responseText, message); 
                });         
            }            
        }
    }

    updateRaidGroupRole(raidGroupRoleNameToUpdate, message) {    
        if(raidGroupRoleNameToUpdate !== null) {                    
            let hasError = false;

            let roleIdToChangeTo = this.raidGroupRoleMatrix.find((team) => team.name === raidGroupRoleNameToUpdate).id;

            console.log(`roleIdToChange: ${roleIdToChangeTo}`);
            if(message.member.roles.some(o => o.id === roleIdToChangeTo)) { // non team already - revoming
                message.member.removeRole(roleIdToChangeTo).catch((error) => {
                    this.handleMessageError(error, message);
                    hasError = true;
                }).then(() => {
                    let responseText = `You are no longer a part of the cool ${raidGroupRoleNameToUpdate} group!`;
                    this.messageResultToUser(hasError, responseText, message);
                });                                           
            }
            else { // not on team - adding
                message.member.addRole(roleIdToChangeTo).catch((error) => {
                    this.handleMessageError(error, message);
                    hasError = true; 
                }).then(() => {                   
                    let formattedRoleList = this.getFormattedMemberListForRole(message, roleIdToChangeTo);                    
                    let responseText = `You are now part of the cool ${raidGroupRoleNameToUpdate} group! Tagging @${raidGroupRoleNameToUpdate} will notify: ${formattedRoleList}.`;
                    this.messageResultToUser(hasError, responseText, message); 
                });         
            }            
        }
    }

    showRaidGroupMembers(raidGroupRoleNameToShow, message) {    
        if(raidGroupRoleNameToShow !== null) {                    
            let hasError = false;

            let roleIdToShow = this.raidGroupRoleMatrix.find((team) => team.name === raidGroupRoleNameToShow).id;

            let formattedRoleList = this.getFormattedMemberListForRole(message, roleIdToShow);                    
            let responseText = `Members of @${raidGroupRoleNameToShow} group: ${formattedRoleList}.`;
            this.messageResultToUser(hasError, responseText, message);
        }
    }

    getFormattedMemberListForRole(message, roleId) {
        let memberList = '';      

        let role = message.guild.roles.get(roleId);
        let lastKey = role.members.lastKey();

        role.members.forEach(function(value, key) {            
            memberList += value.user.username;
            if(key != lastKey){
                memberList += ', ';
            }
        });        

        return memberList;
    }

    removeOldTeamRoles(teamRoleNameToUpdate, teamMatrix, message){
        let otherTeamRoles = teamMatrix.filter((team) => team.name != teamRoleNameToUpdate)

        otherTeamRoles.forEach(team => {
            console.log(`Compare to ${team.id}`);
            if(message.member.roles.some(o => o.id === team.id))
            {
                console.log(`Also removing ${team.id}`)
                message.member.removeRole(team.id);
            }
        });
    }

    messageResultToUser(hasError, successfulMessage, message) {        
        if(!hasError) {
           message.reply(successfulMessage).catch(console.error);
        }
    }
    
    handleMessageError(error, message){
        console.error(error); 
        message.reply("Opps. That didn't work. Tag hspot so he fixes his bad code!").catch(console.error);    
    }
}

module.exports = DiscordTeamRoleManager;