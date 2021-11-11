MsgDirEnum = {
    IN: 0,
    OUT: 1,
    NONE: 2
}

/****************************************
 *  Global exception handling
 ****************************************/
//process.on('uncaughtException', function(err) {

//    console.log('Exception caught: ', err);

//});

/****************************************
 *  Initialization
 ****************************************/
var exec = require('child_process').exec;
var pad = require('node-string-pad');

var date = new Date();
var hour = date.getHours();

var fs = require('fs');
var path = require('path');

const { accessconnection } = require('../model/DbConn.js');
const jwt = require('jsonwebtoken');

var ERR = 'ERR';


function request(req, desc, operation_type, status) {

    const header = req.headers['authorization'];

    if (typeof header !== 'undefined') {
        const bearer = header.split(' ');
        const token = bearer[1];

        try {
            let decodedToken = jwt.decode(token);
            accessconnection.query(`INSERT INTO system_audit_trail_tab(member_id,operation_type,operation_detail,status) VALUES ('${decodedToken.ID}','${operation_type}','${desc}','${status}')`, function (error, rows, field) {
                if (error) throw error;
        
                
            });
            
        } catch (error) {
            
            return false;
        }

    } else {
        //If header is undefined return Forbidden (403)

        res.redirect('/filter?token=');
        return false
    }
}

module.exports = {
    request
}







