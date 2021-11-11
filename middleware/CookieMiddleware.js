var moment = require('moment');
var promise = require('promise');

var log = require('../utils/logger.js');
var conf = require('../utils/conf.js');

function checkCookies(req, res, next) {
    res.cookie('active', moment().valueOf(), {
        // maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    });
    next();
}

module.exports = {
    checkCookies
}