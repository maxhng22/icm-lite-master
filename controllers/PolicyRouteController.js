const moment = require('moment');

const log = require('../utils/logger.js');
const { connection, queryPromise } = require('../model/DbConn.js');
const audit = require('../utils/audit.js');

var conf = require('../utils/conf.js');


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

async function policyAddReq(req, res) {
  const tag = 'policyAddReq'
  const referenceId = req.body.referenceId;
  const policyGroupId = req.body.policyGroupId;
  const uplinkBitRate = req.body.uplinkBitRate;
  const downlinkBitRate = req.body.downlinkBitRate;
  const policyName = req.body.policyName;
  const timeQuota = req.body.timeQuota;
  const volQuota = req.body.volQuota;
  const dpiIdGroupId = req.body.dpiIdGroupId;
  const lowerBondThres = req.body.lowerBondThres;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (typeof policyGroupId !== 'number') {
      return sendError(req, res, tag, referenceId, '512')
    }

    if (policyGroupId < 1 || policyGroupId > 999999) {
      return sendError(req, res, tag, referenceId, '513')
    }

    if (!policyName) {
      return sendError(req, res, tag, referenceId, '515')
    }

    if (policyName.length > 30) {
      return sendError(req, res, tag, referenceId, '515')
    }

    if (typeof uplinkBitRate !== 'number') {
      return sendError(req, res, tag, referenceId, '517')
    }

    if (uplinkBitRate < 0 || uplinkBitRate > 300000) {
      return sendError(req, res, tag, referenceId, '518')
    }

    if (typeof downlinkBitRate !== 'number') {
      return sendError(req, res, tag, referenceId, '519')
    }

    if (downlinkBitRate < 0 || downlinkBitRate > 300000) {
      return sendError(req, res, tag, referenceId, '520')
    }

    if (typeof timeQuota !== 'number') {
      return sendError(req, res, tag, referenceId, '521')
    }

    if (timeQuota < 1800 || timeQuota > 86400) {
      return sendError(req, res, tag, referenceId, '522')
    }

    if (typeof volQuota !== 'number') {
      return sendError(req, res, tag, referenceId, '523')
    }

    if (volQuota < 50 || volQuota > 1000) {
      return sendError(req, res, tag, referenceId, '524')
    }

    if (typeof lowerBondThres !== 'number') {
      return sendError(req, res, tag, referenceId, '525')
    }

    if (lowerBondThres < 0 || lowerBondThres > 100000) {
      return sendError(req, res, tag, referenceId, '526')
    }

    if (typeof dpiIdGroupId !== 'number') {
      return sendError(req, res, tag, referenceId, '528')
    }

    let operation = "INSERT INTO policy_list_tab"
    let update_field = `(policy_group_id, policy_name, uplink_bit_rate, downlink_bit_rate, quota_time, quota_volume, dpi_id_group_id, tier_threshold)`
    let update_value = `VALUES (${policyGroupId}, "${policyName}", ${uplinkBitRate}, ${downlinkBitRate}, ${timeQuota}, ${volQuota * 1000000}, ${dpiIdGroupId}, ${lowerBondThres * 1000000})`

    let query = `${operation} ${update_field} ${update_value}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows
    try {
      rows = await queryPromise(query).then(res => res)
    } catch (error) {
      if (error.errno === 1062) {
        if (error.sqlMessage.includes('policy_name')) {
          return sendError(req, res, tag, referenceId, '516')
        } else if (error.sqlMessage.includes('lowerbond')) {
          return sendError(req, res, tag, referenceId, '527')
        }
      }
      throw error
    }

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

async function policyUpdateReq(req, res) {
  const tag = 'policyUpdateReq'
  const referenceId = req.body.referenceId;
  const uplinkBitRate = req.body.uplinkBitRate;
  const downlinkBitRate = req.body.downlinkBitRate;
  const policyName = req.body.policyName;
  const timeQuota = req.body.timeQuota;
  const volQuota = req.body.volQuota;
  const dpiIdGroupId = req.body.dpiIdGroupId;
  const lowerBondThres = req.body.lowerBondThres;
  const policyId = req.body.policyId;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (typeof policyId !== 'number') {
      return sendError(req, res, tag, referenceId, '511')
    }

    if (!policyName) {
      return sendError(req, res, tag, referenceId, '515')
    }

    if (policyName.length > 30) {
      return sendError(req, res, tag, referenceId, '515')
    }

    if (typeof uplinkBitRate !== 'number') {
      return sendError(req, res, tag, referenceId, '517')
    }

    if (uplinkBitRate < 0 || uplinkBitRate > 300000) {
      return sendError(req, res, tag, referenceId, '518')
    }

    if (typeof downlinkBitRate !== 'number') {
      return sendError(req, res, tag, referenceId, '519')
    }

    if (downlinkBitRate < 0 || downlinkBitRate > 300000) {
      return sendError(req, res, tag, referenceId, '520')
    }

    if (typeof timeQuota !== 'number') {
      return sendError(req, res, tag, referenceId, '521')
    }

    if (timeQuota < 1800 || timeQuota > 86400) {
      return sendError(req, res, tag, referenceId, '522')
    }

    if (typeof volQuota !== 'number') {
      return sendError(req, res, tag, referenceId, '523')
    }

    if (volQuota < 50 || volQuota > 1000) {
      return sendError(req, res, tag, referenceId, '524')
    }

    if (typeof lowerBondThres !== 'number') {
      return sendError(req, res, tag, referenceId, '525')
    }

    if (lowerBondThres < 0 || lowerBondThres > 100000) {
      return sendError(req, res, tag, referenceId, '526')
    }

    if (typeof dpiIdGroupId !== 'number') {
      return sendError(req, res, tag, referenceId, '528')
    }

    let selectPolicyOp = `SELECT count(*) as policycount FROM policy_list_tab WHERE id =${policyId}`
    log.log(req.tid, tag, 'SQL: ' + selectPolicyOp);
    let policy_row = await queryPromise(selectPolicyOp).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + policy_row[0]['policycount']);
    if (policy_row[0]['policycount'] === 0) {
      return sendError(req, res, tag, referenceId, '531')
    }

    let operation = "UPDATE policy_list_tab"
    let update_value = `SET policy_name='${policyName}', uplink_bit_rate=${uplinkBitRate}, downlink_bit_rate=${downlinkBitRate}, quota_time=${timeQuota}, quota_volume=${volQuota * 1000000} , dpi_id_group_id=${dpiIdGroupId}, tier_threshold=${lowerBondThres * 1000000}`
    let condition = `WHERE id=${policyId}`

    let query = `${operation} ${update_value} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows
    try {
      rows = await queryPromise(query).then(res => res)
    } catch (error) {
      if (error.errno === 1062) {
        if (error.sqlMessage.includes('policy_name')) {
          return sendError(req, res, tag, referenceId, '516')
        } else if (error.sqlMessage.includes('lowerbond')) {
          return sendError(req, res, tag, referenceId, '527')
        }
      }
      throw error
    }

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

async function policyQueryReq(req, res) {
  const tag = 'policyQueryReq'
  const referenceId = req.body.referenceId;
  const policyId = req.body.policyId;
  const policyGroupId = req.body.policyGroupId;
  const policyName = req.body.policyName;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (policyId === undefined && policyGroupId === undefined && policyName === undefined) {
      return sendError(req, res, tag, referenceId, '530')
    }

    if (policyId !== undefined) {
      if (typeof policyId !== 'number') {
        return sendError(req, res, tag, referenceId, '511')
      }
    }

    if (policyGroupId !== undefined) {
      if (typeof policyGroupId !== 'number') {
        return sendError(req, res, tag, referenceId, '512')
      }

      if (policyGroupId < 1 || policyGroupId > 999999) {
        return sendError(req, res, tag, referenceId, '513')
      }
    }

    if (policyName !== undefined) {
      if (!policyName) {
        return sendError(req, res, tag, referenceId, '515')
      }

      if (policyName && policyName.length > 30) {
        return sendError(req, res, tag, referenceId, '515')
      }
    }

    let operation = `SELECT id AS policyId, policy_name AS policyName, policy_group_id AS policyGroupId, tier_threshold DIV 1000000 AS lowerBondThres, uplink_bit_rate AS uplinkBitRate , downlink_bit_rate AS downlinkBitRate, quota_time AS timeQuota, quota_volume DIV 1000000 AS volQuota, dpi_id_group_id AS dpiIdGroupId FROM policy_list_tab`
    let filter = ""

    if (policyId) {
      filter += `${filter ? ' AND' : ''}id=${policyId}`
    }

    if (policyName) {
      filter += `${filter ? ' AND ' : ''}policy_name='${policyName}'`
    }

    if (policyGroupId) {
      filter += `${filter ? ' AND ' : ''}policy_group_id=${policyGroupId}`
    }

    if (!filter) {
      return sendError(req, res, tag, referenceId, '530')
    }

    let condition = `WHERE ${filter} ORDER BY tier_threshold`
    let query = `${operation} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      referenceId: referenceId,
      errorCode: "000",
      policyList: rows,
      errorMessage: ERROR_MESSAGE.get("000")
    });
  } catch (error) {
    return sendError(req, res, tag, referenceId, '500', 'EXCEPTION: ' + error.message)
  }
}

async function policyDeleteReq(req, res) {
  const tag = 'policyDeleteReq'
  const referenceId = req.body.referenceId;
  const policyId = req.body.policyId;
  let policyGroupId = req.body.policyGroupId;
  const policyName = req.body.policyName;

  try {
    if (!referenceId) {
      return sendError(req, res, tag, referenceId, '501')
    }

    if (policyId === undefined && policyGroupId === undefined && policyName === undefined) {
      return sendError(req, res, tag, referenceId, '530')
    }

    if (policyId !== undefined) {
      if (typeof policyId !== 'number') {
        return sendError(req, res, tag, referenceId, '511')
      }
    }

    if (policyGroupId !== undefined) {
      if (typeof policyGroupId !== 'number') {
        return sendError(req, res, tag, referenceId, '512')
      }

      if (policyGroupId < 1 || policyGroupId > 999999) {
        return sendError(req, res, tag, referenceId, '513')
      }
    }

    if (policyName !== undefined) {
      if (!policyName) {
        return sendError(req, res, tag, referenceId, '515')
      }

      if (policyName && policyName.length > 30) {
        return sendError(req, res, tag, referenceId, '515')
      }
    }

    let selectPolicyOperation = "SELECT * FROM policy_list_tab"
    let operation = "DELETE FROM policy_list_tab"

    let filter = ""

    if (policyId) {
      filter += `${filter ? ' AND' : ''}id=${policyId}`
    }

    if (policyName) {
      filter += `${filter ? ' AND ' : ''}policy_name='${policyName}'`
    }

    if (policyGroupId) {
      filter += `${filter ? ' AND ' : ''}policy_group_id=${policyGroupId}`
    }

    if (!filter) {
      return sendError(req, res, tag, referenceId, '530')
    } else {
      filter += ` AND type="GNL"`
    }

    let condition = `WHERE ${filter}`

    let query = `${operation} ${condition}`

    // if (!policyGroupId) {
    let SelectPolicyQuery = `${selectPolicyOperation} ${condition}`

    log.log(req.tid, tag, 'SQL: ' + SelectPolicyQuery);
    let policy_rows = await queryPromise(SelectPolicyQuery).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (policy_rows.length !== undefined ? policy_rows.length : policy_rows.affectedRows));

    if (policy_rows.length === 0) {
      return sendError(req, res, tag, referenceId, '531')
    }

    policyGroupId = policy_rows[0].policy_group_id
    log.log(req.tid, tag, `Pending delete policy_group_id [${policyGroupId}]`);
    // }

    let selectImsiOperation = "SELECT count(*) as usagecount FROM usage_tab"
    let selectImsiOperation_query = `${selectImsiOperation} WHERE policy_group_id=${policyGroupId}`

    log.log(req.tid, tag, 'SQL: ' + selectImsiOperation_query);
    let imsi_rows = await queryPromise(selectImsiOperation_query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (imsi_rows.length !== undefined ? imsi_rows[0]['usagecount'] : imsi_rows.affectedRows));

    if (imsi_rows[0]['usagecount'] === 0) {
      log.log(req.tid, tag, `No IMSI bound to policy_group_id [${policyGroupId}], proceed`);

      log.log(req.tid, tag, 'SQL: ' + query);
      let rows = await queryPromise(query).then(res => res)
      log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

      res.send({
        referenceId: referenceId,
        errorCode: "000",
        errorMessage: ERROR_MESSAGE.get("000")
      });
      return
    }

    if (!policyId && !policyName) {
      log.log(req.tid, tag, `Exist IMSI bound to policy_group_id [${policyGroupId}], no other DELETE condition exist, discard request`);
      return sendError(req, res, tag, referenceId, '529')
    }

    let policyCountOp = `SELECT count(*) as policycount FROM policy_list_tab`
    let policyChecking_query = `${policyCountOp} WHERE policy_group_id=${policyGroupId} AND type="GNL"`
    log.log(req.tid, tag, 'SQL: ' + policyChecking_query);
    let policy_rows2 = await queryPromise(policyChecking_query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (policy_rows2.length !== undefined ? policy_rows2[0]['policycount'] : policy_rows2.affectedRows));
    // log.log(req.tid, tag, 'SQL RES TESTING: '+policy_rows2[0]['policycount'])
    if (policy_rows2[0]['policycount'] === 1) {
      log.log(req.tid, tag, `Exist IMSI bound to policy_group_id [${policyGroupId}], only 1 policy with policy_group_id [${policyGroupId}], discard request`);
      return sendError(req, res, tag, referenceId, '529')
    }

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

async function policyQueryAll(req, res) {
  const tag = 'policyQueryAll'
  const referenceId = req.body.referenceId;

  try {
    let operation = `SELECT dilt.*, plt.id AS policyId, plt.policy_name AS policyName, plt.policy_group_id AS policyGroupId, plt.tier_threshold DIV 1000000 AS lowerBondThres, plt.uplink_bit_rate AS uplinkBitRate , plt.downlink_bit_rate AS downlinkBitRate, plt.quota_time AS timeQuota, plt.quota_volume DIV 1000000 AS volQuota, plt.dpi_id_group_id AS dpiIdGroupId FROM policy_list_tab as plt`
    let join = ` left join dpi_id_list_tab as dilt on plt.dpi_id_group_id=dilt.dpi_id_group_id`
    let condition = ` ORDER BY tier_threshold`

    let query = `${operation} ${join} ${condition}`

    log.log(req.tid, 'policyQueryAll', 'SQL: ' + query);
    let rows = await queryPromise(query).then(res => res)
    log.log(req.tid, tag, 'SQL RES: ' + (rows.length !== undefined ? rows.length : rows.affectedRows));

    res.send({
      // referenceId: referenceId,
      policyList: rows,
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
  policyAddReq,
  policyUpdateReq,
  policyQueryReq,
  policyDeleteReq,
  policyQueryAll
}