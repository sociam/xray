'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
/*
Simply logger to correctly error messages to systemd.
*/

const util = require('util');
const EMERG = 0,
    ALERT = 1,
    CRIT = 2,
    ERR = 3,
    WARNING = 4,
    NOTICE = 5,
    INFO = 6,
    DEBUG = 7;

var prefixes = ['<0>', '<1>', '<2>', '<3>', '<4>', '<5>', '<6>', '<7>'];

function log(level, args) {
    var format = util.format.apply(null, args).replace(/\n/g, '\n' + prefixes[level]);
    process.stdout.write(prefixes[level] + format + '\n');
}

module.exports = {
    emerg: function() {
        log(EMERG, arguments);
    },
    alert: function() {
        log(ALERT, arguments);
    },
    crit: function() {
        log(CRIT, arguments);
    },
    err: function() {
        log(ERR, arguments);
    },
    warning: function() {
        log(WARNING, arguments);
    },
    notice: function() {
        log(NOTICE, arguments);
    },
    info: function() {
        log(INFO, arguments);
    },
    debug: function() {
        log(DEBUG, arguments);
    }
};
