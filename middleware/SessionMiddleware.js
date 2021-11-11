const moment = require('moment');
const promise = require('promise');
const jwt = require('jsonwebtoken');
const ms = require('ms');

const conf = require('../utils/conf.js');
const log = require('../utils/logger.js');
const code = require('../utils/code.js');


/* exclude route from session checking */
var exclude = ['/login','/policyQueryAll','/public/.*', '/imsiAddReq', '/imsiUpdateReq','/imsiDeleteReq','/imsiResetReq','/imsiQueryReq','/policyAddReq','/policyUpdateReq','/policyQueryReq', '/policyQueryReq', '/policyDeleteReq'];

function activeSession(req, res, next) {
    if (!conf.bypass_login) {
        if (req.headers['user-agent'] === 'logstashrubyscript' &&
            (req.originalUrl === '/link/all' || req.originalUrl === '/linkset/all')) {
            next(); // bypass token checking for /link/all from Ruby script
        } else if (!checkExclude(req.originalUrl)) {
            if ( checkToken(req)) {
             
                let token = updateToken(req);
                // req.query.token = token;
                req.session.token = token;
                
                if (req.originalUrl === '/') {
                    res.redirect('/filter?token=' + token); // valid token but at login page, redirect to filter page
                } else {
                    next();
                }
            } else if (req.session.token && checkToken(req)) {
         
                let token = updateToken(req);
                // req.query.token = token;
                req.session.token = token;
                if (req.originalUrl === '/') {
                    res.redirect('/filter?token=' + token); // valid token but at login page, redirect to filter page
                } else {
                    next();
                }
            } else { // token expired/invalid
                if (req.originalUrl === '/') {
                    next();
                } else {
                    res.redirect('/');
                }
            }
        } else {
            next();
        }
    } else { // bypass token checking
        next();
    }
}

function checkExclude(url) {
    if(conf.debug) {
        return true 
    }
    var found = exclude.find(route => {
        return new RegExp(route).test(url)
    })
    if (found) {
        return true;
    } else {
        return false;
    }
}

function checkToken(req) {
   
    const header = req.headers['authorization'];

    if (typeof header !== 'undefined') {
        const bearer = header.split(' ');
        const token = bearer[1];
   
 
        try {
            let decodedToken = jwt.decode(token);
   
        let  decodedTokens = jwt.verify(token, 'secret');
        
            return true
        } catch (error) {
         
            console.log(error);
            return false;
        }
       
    } else {
        //If header is undefined return Forbidden (403)
        return false
    }
}


/* refresh token */
function updateToken(req) {
    const header = req.headers['authorization'];

        const bearer = header.split(' ');
        const token = bearer[1];

    let decodedToken = jwt.decode(token);
 
    
    return jwt.sign({
        ID: decodedToken.ID,
        username: decodedToken.username,
        type: decodedToken.type,
        lastActive: moment.valueOf(),
    }, 'secret');
}

module.exports = {
    activeSession
}