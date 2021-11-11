const moment = require('moment');

const log = require('../utils/logger.js');
const { connection, queryPromise } = require('../model/DbConn.js');
const audit = require('../utils/audit.js');

var conf = require('../utils/conf.js');


function IcsQueryAll(req, res) {

  let operation = `SELECT * FROM ics_info_tab`
  let condition = ` ORDER BY id`

  let query = `${operation} ${condition}`

  
  log.log(req.tid, 'IcsQueryAll', 'SQL: ' + query);
  connection.query(`${query}`, function (error, rows, field) {
    if (error) {
      res.send({
        // referenceId:referenceId,
        errorCode: "500"
      });
      throw error;
    }

    res.send({
      // referenceId: referenceId,
      errorCode: "000",
      dataList: rows
    });

  });


}

module.exports = {
  IcsQueryAll,
}