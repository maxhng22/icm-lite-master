const jwt = require('jsonwebtoken');
const conf = require('../utils/conf.js');
const log = require('../utils/logger.js');

function checkAdministrator(req, res, next) {
    let token

    try {
        if (req.query.token) {
            token = jwt.verify(req.query.token, conf.appName + '|' + conf.LMD + '|' + conf.version);
        } else {
            token = jwt.verify(req.session.token, conf.appName + '|' + conf.LMD + '|' + conf.version);
        }
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.redirect('/logout');
        } else {
            let token = (req.query.token) ? req.query.token : req.session.token
            return res.redirect('/filter?token=' + token);
        }
    }
    if (token.type === 'administrator') {
        // PT, 2019-06-18
        req.session.adminType = 'administrator'
        next();
    } else {
        let token = (req.query.token) ? req.query.token : req.session.token
        res.redirect('/filter?token=' + token);
    }
}

module.exports = {
    checkAdministrator,
}