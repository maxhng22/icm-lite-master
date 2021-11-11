var mysql = require('mysql');

var conf = require('../utils/conf.js');
var log = require('../utils/logger.js');

this.connection  = mysql.createPool({
    host : conf.db_host,
    port : conf.db_port,
    database : conf.db_name,
    user : conf.db_username,
    password : conf.db_password,
    connectionLimit : conf.db_poolLimit,
});


this.reportconnection  = mysql.createPool({
    host : conf.reportdb_host,
    port : conf.reportdb_port,
    database :conf.reportdb_name,
    user : conf.reportdb_username,
    password : conf.reportdb_password,
    connectionLimit : conf.reportdb_poolLimit,
});

this.accessconnection  = mysql.createPool({
    host : conf.accessdb_host,
    port : conf.accessdb_port,
    database :conf.accessdb_name,
    user : conf.accessdb_username,
    password : conf.accessdb_password,
    connectionLimit : conf.accessdb_poolLimit,
});

this.alarmconnection  = mysql.createPool({
    host : conf.alarmdb_host,
    port : conf.alarmdb_port,
    database :conf.alarmdb_name,
    user : conf.alarmdb_username,
    password : conf.alarmdb_password,
    connectionLimit : conf.alarmdb_poolLimit,
});


let queryPromise = (sqlstatement, connectionTemp) => {
    let connection = connectionTemp || this.connection||this.accessconnection

    return new Promise((resolve, reject) => {
        connection.query(sqlstatement, function (error, rows, field) {
            if (error) {
                reject(error);
                return
            }
            resolve(rows)
        });
    });
}



module.exports = {
    connection: this.connection,
    reportconnection:this.reportconnection,
    accessconnection:this.accessconnection,
    alarmconnection:this.alarmconnection,
    queryPromise,
}