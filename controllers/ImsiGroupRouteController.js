const moment = require('moment');

const log = require('../utils/logger.js');
const { connection, queryPromise } = require('../model/DbConn.js');
const audit = require('../utils/audit.js');
var FileReader = require('filereader')
const fs = require('fs');
const mysql = require('mysql')

const ERROR_MESSAGE = new Map([
  ['000', 'Success'],
  ['001', 'Unauthorized, api key incorrect'],
  ['002', 'API format incorrect'],
  ['500', 'InternalError/DBError'],
  ['501', 'referenceId format incorrect or empty string'],
  ['502', 'IMSI format incorrect or empty string'],
  ['503', 'Duplicated IMSI'],
  ['504', 'IMSI not found'],
  ['505', 'rarTrigger format incorrect or empty string'],
  ['511', 'PolicyID is not numeric'],
  ['512', 'PolicyGroupID is not numeric'],
  ['513', 'PolicyGroupID not within the range'],
  ['514', 'PolicyGroupID not yet configured in system'],
  ['515', 'PolicyName format incorrect or empty string'],
  ['516', 'Duplicated PolicyName in the system'],
  ['517', 'uplinkBitRate not numeric'],
  ['518', 'uplinkBitRate not within the range'],
  ['519', 'downlinkBitRate not numeric'],
  ['520', 'downlinkBitRate not within the range'],
  ['521', 'timeQuota not numeric'],
  ['522', 'timeQuota not within the range'],
  ['523', 'volQuota not numeric'],
  ['524', 'volQuota not within the range'],
  ['525', 'lowerBondThres not numeric'],
  ['526', 'lowerBondThres not within the range'],
  ['527', 'Duplicated lowerBondThres in the same policy group id'],
  ['528', 'dpiIdGroupId not numeric'],
  ['529', 'Action rejcted due to PolicyGroupID has bounded to IMSI. At least one policy configured in a PolicyGroupID if IMSI bonded'],
  ['530', 'Need At least one attribute'],
  ['531', 'Policy not found'],
])

async function imsiAddReq(req, res, next) {
  const tag = 'imsiAddReq'
  const referenceId = req.body.referenceId;
  const imsi = req.body.imsi;
  let policyGroupId = req.body.policyGroupId;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (!imsi) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!/^\d+$/.test(imsi)) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (typeof policyGroupId !== 'number') {
      return sendError(req, res, tag, referenceId, '512')
    }

    if (policyGroupId < 1 || policyGroupId > 999999) {
      return sendError(req, res, tag, referenceId, '513')
    }

    const hash_num = parseInt(String(imsi).slice(-2)) || 0;

    let selectOp = 'SELECT COUNT(*) AS COUNT from usage_tab'
    let condition = `WHERE imsi='${imsi}' AND hash_num=${hash_num}`
    let query = `${selectOp} ${condition}`
    log.log(req.tid, tag, 'SQL: ' + query);
    let imsi_rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + imsi_rows.length);
    if (imsi_rows[0]['COUNT'] > 0) {
      return sendError(req, res, tag, referenceId, '503')
    }

    let checkPolicy = "SELECT COUNT(*) AS COUNT from policy_list_tab"
    let checkCondition = `WHERE policy_group_id=${policyGroupId}`
    let checkPolicyQuery = `${checkPolicy} ${checkCondition}`
    log.log(req.tid, tag, 'SQL: ' + checkPolicyQuery);
    let policy_row = await queryPromise(checkPolicyQuery).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + policy_row.length);
    if (policy_row[0]['COUNT'] < 1) {
      return sendError(req, res, tag, referenceId, '514')
    }

    let insertOp = 'INSERT INTO usage_tab '
    let update_field = ""
    let update_value = ""

    if (imsi) {
      update_field = 'imsi'
      update_value = `"${imsi}"`
    }

    if (hash_num) {
      update_field += ",hash_num"
      update_value += `,${hash_num}`
    }

    if (policyGroupId) {
      update_field += ",policy_group_id"
      update_value += `,${policyGroupId}`
    }

    let insertquery = `${insertOp} (${update_field}) VALUES(${update_value})`
    log.log(req.tid, tag, 'SQL: ' + insertquery);
    let rows = await queryPromise(insertquery).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      referenceId: referenceId,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function imsiUpdateReq(req, res, next) {
  const tag = 'imsiUpdateReq'
  const referenceId = req.body.referenceId;
  const imsi = req.body.imsi;
  let policyGroupId = req.body.policyGroupId;
  const rarTrigger = req.body.rarTrigger;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (!imsi) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!/^\d+$/.test(imsi)) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!rarTrigger || (rarTrigger !== 'Y' && rarTrigger !== 'N')) {
      return sendError(req, res, tag, referenceId, '505')
    }

    if (typeof policyGroupId !== 'number') {
      return sendError(req, res, tag, referenceId, '512')
    }

    if (policyGroupId < 1 || policyGroupId > 999999) {
      return sendError(req, res, tag, referenceId, '513')
    }

    const hash_num = parseInt(String(imsi).slice(-2)) || 0;


    let selectCountOp = 'SELECT COUNT(*) AS COUNT from usage_tab'
    let conditionImsi = `WHERE imsi='${imsi}' AND hash_num=${hash_num}`
    let queryImsiSelect = `${selectCountOp} ${conditionImsi}`
    log.log(req.tid, tag, 'SQL: ' + queryImsiSelect);
    let imsi_rows = await queryPromise(queryImsiSelect).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + imsi_rows.length);
    if (imsi_rows[0]['COUNT'] === 0) {
      return sendError(req, res, tag, referenceId, '504')
    }

    let sqlQuery = mysql.format('SELECT COUNT(*) AS COUNT FROM policy_list_tab WHERE policy_group_id = ?', policyGroupId);
    log.log(req.tid, tag, 'SQL: ' + sqlQuery);
    let sqlResult = await queryPromise(sqlQuery).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + sqlResult.length);
    if (sqlResult[0]['COUNT'] === 0) {
      return sendError(req, res, tag, referenceId, '514')
    }

    let operation = "UPDATE usage_tab"
    let update_value = `SET policy_group_id=${policyGroupId}`
    let condition = `WHERE hash_num=${hash_num} AND imsi="${imsi}"`

    if (rarTrigger !== "N") {
      update_value += ", session_expired_datetime=NOW(), send_rar='N', send_rar_datetime=NULL"
    }

    let query = `${operation} ${update_value} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      referenceId: referenceId,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function imsiDeleteReq(req, res, next) {
  const tag = 'imsiDeleteReq'
  const referenceId = req.body.referenceId;
  const imsi = req.body.imsi;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (!imsi) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!/^\d+$/.test(imsi)) {
      return sendError(req, res, tag, referenceId, '502')
    }

    const hash_num = parseInt(String(req.body.imsi).slice(-2)) || 0;


    let selectCountOp = 'SELECT COUNT(*) AS COUNT from usage_tab'
    let conditionImsi = `WHERE imsi='${imsi}' AND hash_num=${hash_num}`
    let queryImsiSelect = `${selectCountOp} ${conditionImsi}`
    log.log(req.tid, tag, 'SQL: ' + queryImsiSelect);
    let imsi_rows = await queryPromise(queryImsiSelect).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + imsi_rows.length);
    if (imsi_rows[0]['COUNT'] === 0) {
      return sendError(req, res, tag, referenceId, '504')
    }

    let operation = "DELETE FROM usage_tab"
    let condition = `WHERE hash_num=${hash_num} AND imsi="${imsi}"`

    let query = `${operation} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      referenceId: referenceId,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function imsiQueryReq(req, res, next) {
  const tag = 'imsiQueryReq'
  const referenceId = req.body.referenceId;
  const imsi = req.body.imsi;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (!imsi) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!/^\d+$/.test(imsi)) {
      return sendError(req, res, tag, referenceId, '502')
    }

    const hash_num = parseInt(String(req.body.imsi).slice(-2));

    let operation = "SELECT ut.imsi, ut.policy_group_id, ut.accum_uplink, ut.accum_downlink, ut.node_id, plt.policy_name FROM usage_tab AS ut, policy_list_tab AS plt"
    let condition = `WHERE ut.policy_group_id = plt.policy_group_id AND hash_num=${hash_num} AND imsi='${imsi}' 
    AND (ut.accum_uplink + ut.accum_downlink) >= plt.tier_threshold ORDER BY plt.tier_threshold DESC LIMIT 1`

    let query = `${operation} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));
    if (rows.length > 0) {
      let result = rows[0]
      return res.send({
        // dataList: rows,
        referenceId: referenceId,
        policyGroupId: result.policy_group_id,
        policyName: result.policy_name,
        accumUplink: result.accum_uplink,
        accumDownlink: result.accum_downlink,
        nodeId: result.node_id,
        errorCode: "000",
        errorMessage: ERROR_MESSAGE.get("000")
      });
    }

    let selectQuery = `SELECT imsi, policy_group_id, accum_uplink, accum_downlink, node_id from usage_tab WHERE hash_num=${hash_num} AND imsi='${imsi}'`
    log.log(req.tid, tag, 'SQL: ' + selectQuery);
    let imsi_rows = await queryPromise(selectQuery).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + imsi_rows.length);
    if (imsi_rows.length === 0) {
      return sendError(req, res, tag, referenceId, '504')
    }

    let result = imsi_rows[0]
    res.send({
      // dataList: imsi_rows,
      referenceId: referenceId,
      policyGroupId: result.policy_group_id,
      policyName: "",
      accumUplink: result.accum_uplink,
      accumDownlink: result.accum_downlink,
      nodeId: result.node_id,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function imsiResetReq(req, res, next) {
  const tag = 'imsiResetReq'
  const referenceId = req.body.referenceId;
  const imsi = req.body.imsi;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (!imsi) {
      return sendError(req, res, tag, referenceId, '502')
    }

    if (!/^\d+$/.test(imsi)) {
      return sendError(req, res, tag, referenceId, '502')
    }

    const hash_num = parseInt(String(req.body.imsi).slice(-2));

    let selectCountOp = 'SELECT COUNT(*) AS COUNT from usage_tab'
    let conditionImsi = `WHERE imsi='${imsi}' AND hash_num=${hash_num}`
    let queryImsiSelect = `${selectCountOp} ${conditionImsi}`
    log.log(req.tid, tag, 'SQL: ' + queryImsiSelect);
    let imsi_rows = await queryPromise(queryImsiSelect).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + imsi_rows.length);
    if (imsi_rows[0]['COUNT'] === 0) {
      return sendError(req, res, tag, referenceId, '504')
    }

    let operation = "UPDATE usage_tab"
    let update_value = `SET accum_uplink=0, accum_downlink=0, last_reset_datetime=NOW()`
    let condition = `WHERE hash_num=${hash_num} AND imsi="${imsi}"`

    let query = `${operation} ${update_value} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      referenceId: referenceId,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function imsiQueryAll(req, res, next) {
  const tag = 'imsiQueryAll'
  const referenceId = req.body.referenceId;

  try {
    let operation = "SELECT ut.*, plt.policy_name FROM usage_tab as ut left JOIN policy_list_tab as plt  ON ut.policy_group_id = plt.policy_group_id"
    let condition = ``

    let query = `${operation} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      dataList: rows,
      // referenceId: referenceId,
      // policyGroupId: result.policyGroupId,
      // policyName: result.policyName,
      // accumUplink: result.accumUplink,
      // accumDownlink: result.accumDownlink,
      // nodeId: result.nodeId,
      errorCode: "000",
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

function sendError(req, res, tag, referenceId, errorCode, errorLog) {
  if (!errorLog) {
    if (ERROR_MESSAGE.get(errorCode)) {
      errorLog = `ERROR: ${errorCode} ${ERROR_MESSAGE.get(errorCode)}`
    } else {
      errorLog = `ERROR: ${errorCode} Unknown Error`
    }
  }

  log.log(req.tid || '', tag, errorLog);

  let error = {
    errorCode: errorCode,
    errorMessage: ERROR_MESSAGE.get(errorCode) || ERROR_MESSAGE.get('500')
  }

  if (referenceId) {
    error['referenceId'] = referenceId
  }

  res.send(error);
  return true
}

module.exports = {
  imsiAddReq,
  imsiUpdateReq,
  imsiDeleteReq,
  imsiResetReq,
  imsiQueryReq,
  imsiQueryAll
}