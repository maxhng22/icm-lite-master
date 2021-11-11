const moment = require('moment');
const log = require('../utils/logger.js');
const { connection } = require('../model/DbConn.js');
const { accessconnection } = require('../model/DbConn.js');
const audit = require('../utils/audit.js');
const conf = require('../utils/conf.js');
const jwt = require('jsonwebtoken');
const md5 = require('md5');


function login(req, res) {
  log.log(req.tid, "General", req.body.username + ' trying to login');

  const password1 = req.body.password;
  const username = req.body.username;

  log.log(req.tid, "General", `SELECT * FROM members_tab WHERE username='${username}' And password='${md5(password1)}'`);
  accessconnection.query(`SELECT * FROM members_tab WHERE username='${username}' And password='${md5(password1)}'`, function (error, rows, field) {
    if (error) throw error;

    console.log(rows.length)
    if (rows.length <= 0) {
      log.log(req.tid, "General", 'Error: Invalid passowrd or username');
      res.send({ errorCode: '200' });
      return
    }

    let lock_date
    if (rows[0].lock_datetime) {
      lock_date = moment(rows[0].lock_datetime)
    }

    let expired_date
    if (rows[0].expiry_datetime) {
      expired_date = moment(rows[0].expiry_datetime)
    }

    let currentTime = moment()
    let rowUsername = rows[0].username
    let type = rows[0].type


    if (rows[0].expiry_datetime && currentTime.isSameOrAfter(expired_date)) {
      log.log(req.tid, "General", 'Error: Expired Date');
      res.send({ errorCode: '400' });
      return
    }

    if (rows[0].lock_datetime && !currentTime.isSameOrAfter(lock_date)) {
      log.log(req.tid, "General", 'Error: Locked');
      res.send({ errorCode: '300' });
      return
    }


    if (rows[0].password === md5(password1) || rows[0].password === password1) {
      accessconnection.query("UPDATE members_tab SET num_trial='" + 0 + "' WHERE username='" + username + "'", function (error, rows2, field) {
        if (error) throw error;


        let token = jwt.sign({
          ID: rows[0].id,
          username: rowUsername,
          type: type,
          lastActive: moment.valueOf(),
        }, 'secret', { expiresIn: '1y' })


        /* session */
        req.session.username = rowUsername;
        req.session.adminType = type;
        req.session.token = token;

        /* cookie */
        res.cookie('active', moment().valueOf(), {
          // maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
        });

        accessconnection.query(`
        INSERT INTO system_audit_trail_tab(member_id,operation_type,operation_detail,status) 
        VALUES ('${rows[0].id}',1,'Login.','S')`,
          function (error, rows2, field) {
            if (error) throw error;

            res.send({ expired_date: expired_date, id: rows[0].id, token: token, username: rowUsername, type: type, errormessage: '000' });
          });
      });
    } else {
      let num_trial = rows[0].num_trial + 1
      log.log(req.tid, "General", 'Invalid password');
      if (num_trial >= conf.login_max_retry) {
        let locktime = moment().add(30, 'minutes').format('YYYY/MM/DD HH:mm')
        accessconnection.query("UPDATE members_tab SET num_trial=0, status='" + locktime + "' WHERE username='" + username + "'", function (error, rows, field) {
          if (error) throw error;

          res.send({ errorCode: '200' });
        });
      } else {
        accessconnection.query("UPDATE members_tab SET num_trial=" + num_trial + " WHERE username='" + username + "'", function (error, rows, field) {
          if (error) throw error;

          res.send({ errorCode: '200' });
        });
      }
    }

  });
}


function logout(req, res) {
  audit.request(req, `Logout.`, 2, 'S')
  res.send({errorCode: '000'})
}


function getPermission(req, res) {

  const memberid = req.body.memberid

  accessconnection.query("SELECT * FROM auth_tab JOIN module_tab ON module_tab.id = auth_tab.module_id JOIN function_tab ON function_tab.id=auth_tab.function_id JOIN role_auth_tab ON auth_tab.id = role_auth_tab.auth_id JOIN member_role_tab ON member_role_tab.role_id=role_auth_tab.role_id where member_role_tab.member_id=" + memberid + " ORDER BY auth_tab.id", function (error, rows, field) {
    if (error) throw error;

    res.send({ message: rows, errormessage: '000' });
  });
}


module.exports = {
  login,
  getPermission,
  logout
}