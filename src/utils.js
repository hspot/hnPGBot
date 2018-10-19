var config = require("../config.json");

var logger = {
    debug: function (logItem) {
        if(config.IsDebug) {        
            console.log(logItem)
        }
    },

    log: function (logItem){
        console.log(logItem);
    }
}

module.exports = logger;