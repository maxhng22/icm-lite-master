const moment = require('moment');

const log = require('../utils/logger.js');
const { connection, queryPromise } = require('../model/DbConn.js');
const audit = require('../utils/audit.js');

var conf = require('../utils/conf.js');


// 000 - (Success)
// 001 - Unauthorized, api key incorrect
// 002 - API format incorrect
// 500 - InternalError/DBError
// 501 - referenceId format incorrect or empty string
// 512 - PolicyGroupID is not numeric
// 513 - PolicyGroupID not within the range
// 515 - PolicyName format incorrect or empty string
// 516 - Duplicated PolicyName in the system
// 517 - uplinkBitRate not numeric
// 518 - uplinkBitRate not within the range
// 519 - downlinkBitRate not numeric
// 520 - downlinkBitRate not within the range
// 521 - timeQuota not numeric
// 522 - timeQuota not within the range
// 523 - volQuota not numeric
// 524 - volQuota not within the range
// 525 - lowerBondThres not numeric
// 526 - lowerBondThres not within the range
// 527 - Duplicated lowerBondThres in the same policy group id
// 528 - dpiIdGroupId not numeric

http://localhost:5601/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(),filters:!(),index:'45d04710-3e0c-11ec-a507-1f31e782db78',interval:auto,query:(language:lucene,query:''),sort:!(!('@timestamp',desc)))

function DpiQueryAll(req, res) {

  let operation = `SELECT * FROM dpi_id_list_tab`
  let condition = ` ORDER BY id`

  let query = `${operation} ${condition}`

  log.log(req.tid, 'DpiQueryAll', 'SQL: ' + query);
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
  DpiQueryAll,
}