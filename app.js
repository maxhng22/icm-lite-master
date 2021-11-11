const http = require('http');
const https = require('https');
const express = require('express');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const session = require('express-session');
const cookie = require('cookie-parser');

const ESConn = require('./model/ESConn.js');
const conf = require('./utils/conf.js');
const log = require('./utils/logger.js');
const multer = require('multer');
const os = require("os");
const fs = require('fs');

const GeneralRouteController = require('./controllers/GeneralRouteController.js');
const ImsiGroupRouteController = require('./controllers/ImsiGroupRouteController.js');
const DpiRouteController = require('./controllers/DpiRouteController.js');
const IcsRouteController = require('./controllers/IcsRouteController.js');
const PolicyRouteController = require('./controllers/PolicyRouteController.js');
const SessionMiddleware = require('./middleware/SessionMiddleware.js');
const CookieMiddleware = require('./middleware/CookieMiddleware.js');


conf.appName = 'icm_lite_backend';
conf.version = '1.0.4';
conf.LMD = '2021-03-02';
console.log(conf.appName + ', ' + conf.version + ', ' + conf.LMD);
if(process.argv.includes('-v')) {
  return
}

log.init(conf.version, conf.log_path, conf.log_name, conf.log_extension, conf.log_size, conf.log_transactionIdLength, conf.log_moduleIdLength);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  resave: true,
  saveUninitialized: false,
  secret: 'secret'
}));

var dir_upload = './upload';
if (!fs.existsSync(dir_upload)) {
  fs.mkdirSync(dir_upload);
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'upload')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})
var upload = multer({ storage: storage })

app.use(cors());
app.use(SessionMiddleware.activeSession);
app.use(CookieMiddleware.checkCookies);
app.use((req, res, next) => {
  var hrTime = process.hrtime()
  req.tid = hrTime[0] * 1000000 + hrTime[1]

  let paths = req.path.split('/')
  let tag = paths.length > 0 ? paths[paths.length -1] : ''

  log.logIn(req.tid, tag, `${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`);

  const defaultWrite = res.write;
  const defaultEnd = res.end;
  const chunks = [];

  res.write = (...restArgs) => {
    defaultWrite.apply(res, restArgs);
    chunks.push(Buffer.from(restArgs[0]));
  };

  res.end = (...restArgs) => {
    defaultEnd.apply(res, restArgs);
    if (restArgs[0] && chunks.length === 0) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks).toString('utf8');
    let temp = body || '';
    log.logOut(req.tid, tag, `${req.method} ${req.originalUrl} ${temp}`);
  };
  
  // if(!req.query.api_key || req.query.api_key !== conf.api_key) {
  //   res.send({
  //     errorCode: "001",
  //     errorMessage: "Unauthorized, api key incorrect",
  //   });
  //   return
  // }

  next()
})


const options = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

var privateKey;
var certificate;
var credentials = { key: '', cert: '' };
if (conf.key != null && conf.key != '' && fs.existsSync(conf.key) && fs.statSync(conf.key).isFile()) {
  credentials.key = fs.readFileSync(conf.key, 'utf8');
} else {
  log.logError('', 'HTTPS', 'key not found for HTTPS');
}
if (conf.certificate != null && conf.certificate != '' && fs.existsSync(conf.certificate) && fs.statSync(conf.certificate).isFile()) {
  credentials.cert = fs.readFileSync(conf.certificate, 'utf8');
} else {
  log.logError('', 'HTTPS', 'certificate not found for HTTPS');
}

if (credentials.key != '' && credentials.cert != '') {
  httpsServer = https.createServer(credentials, app).listen(parseInt(conf.https_port), conf.https_host, function() {
    httpsServer.setTimeout(60 * 60 * 1000) // 60 minutes timeout

    log.log(conf.appName + ' | ' +
        conf.version + ' | ' +
        conf.LMD + ' | ' +
        // 'http: ' + conf.http_host + ':' + conf.http_port + ' | ' +
        // 'https: ' + conf.https_host + ':' + conf.https_port );
        'https: ' + conf.https_host + ':' + conf.https_port);
  });
}

var httpServer = http.createServer(app).listen(conf.http_port, conf.http_host, function() {
  httpServer.setTimeout(60 * 60 * 1000) // 60 minutes timeout
  
  log.log(conf.appName + ' | ' +
      conf.version + ' | ' +
      conf.LMD + ' | ' +
      // 'http: ' + conf.http_host + ':' + conf.http_port + ' | ' +
      // 'https: ' + conf.https_host + ':' + conf.https_port );
      'http: ' + conf.http_host + ':' + conf.http_port);

      // ESConn.connect();
      // ESConn.checkConnectionInterval();
});

//Login
app.post('/login', GeneralRouteController.login);
app.post('/logout', GeneralRouteController.logout);
app.post('/getPermission', GeneralRouteController.getPermission);

//Admin
// app.post('/getMembers', MemberRouteController.getMembers);
// app.post('/createMembers', MemberRouteController.createMembers);
// app.post('/editMembers', MemberRouteController.editMembers);
// app.post('/deleteMembers', MemberRouteController.deleteMembers);

//User
// app.post('/getUsers', UserRouteController.getUsers);
// app.post('/createUsers', UserRouteController.createUsers);
// app.post('/changeUserPassword', UserRouteController.changeUserPassword);
// app.post('/deleteUsers', UserRouteController.deleteUsers);
// app.post('/getMemberRoles', UserRouteController.getMemberRoles);
// app.post('/createUserRoles', UserRouteController.createUserRoles);
// app.post('/forceChangePassword', UserRouteController.forceChangePassword);

//Roles
// app.post('/getRoles', RoleRouteController.getRoles);
// app.post('/createRoles', RoleRouteController.createRoles);
// app.post('/editRoles', RoleRouteController.editRoles);
// app.post('/deleteRoles', RoleRouteController.deleteRoles);
// app.post('/createAuthRoles', RoleRouteController.createAuthRoles);
// app.post('/getAuths', RoleRouteController.getAuths);


//Modules
// app.post('/getModules', ModuleRouteController.getModules);
// app.post('/createModules', ModuleRouteController.createModules);
// app.post('/editModules', ModuleRouteController.editModules);
// app.post('/deleteModules', ModuleRouteController.deleteModules);

//Function
// app.post('/getFunctions', FunctionRouteController.getFunctions);
// app.post('/createFunctions', FunctionRouteController.createFunctions);
// app.post('/editFunctions', FunctionRouteController.editFunctions);
// app.post('/deleteFunctions', FunctionRouteController.deleteFunctions);

//ImsiGroup
app.post('/imsiAddReq', ImsiGroupRouteController .imsiAddReq)
app.post('/imsiUpdateReq', ImsiGroupRouteController .imsiUpdateReq)
app.post('/imsiDeleteReq', ImsiGroupRouteController .imsiDeleteReq)
app.post('/imsiResetReq', ImsiGroupRouteController .imsiResetReq)
app.post('/imsiQueryReq', ImsiGroupRouteController .imsiQueryReq)
app.post('/imsiQueryAll', ImsiGroupRouteController .imsiQueryAll)
// app.post('/addImsiPrefix', ImsiGroupRouteController .addImsiPrefix)
// app.post('/editImsiPrefix', ImsiGroupRouteController .editImsiPrefix)
// app.post('/deleteImsiPrefix', ImsiGroupRouteController .deleteImsiPrefix)
// app.post('/uploadImsiPrefix', upload.single('csv'), ImsiGroupRouteController .uploadImsiPrefix)


//Policy_list
app.post('/policyAddReq', PolicyRouteController.policyAddReq)
app.post('/policyUpdateReq', PolicyRouteController.policyUpdateReq)
app.post('/policyQueryReq', PolicyRouteController.policyQueryReq)
app.post('/policyDeleteReq', PolicyRouteController.policyDeleteReq)
app.post('/policyQueryAll', PolicyRouteController.policyQueryAll)

//Dpi
app.post('/DpiQueryAll', DpiRouteController.DpiQueryAll)

// ICS
app.post('/IcsQueryAll', IcsRouteController.IcsQueryAll)

//ControlProfile
// app.post('/getControlProfile', ControlProfileRouteController.getControlProfile)
// app.post('/getProfileTierGroup', ControlProfileRouteController.getProfileTierGroup)
// app.post('/getCosPolicy', ControlProfileRouteController.getCosPolicy)
// app.post('/addControlProfile', ControlProfileRouteController.addControlProfile)
// app.post('/editControlProfile', ControlProfileRouteController.editControlProfile)
// app.post('/deleteControlProfile', ControlProfileRouteController.deleteControlProfile)

//TierGroup
// app.post('/getTierGroup', TierGroupRouteController.getTierGroup)
// app.post('/addTierGroup', TierGroupRouteController.addTierGroup)
// app.post('/editTierGroup', TierGroupRouteController.editTierGroup)
// app.post('/deleteTierGroup', TierGroupRouteController.deleteTierGroup)
// app.post('/resetTierId', TierGroupRouteController.resetTierId)
// app.post('/getTierGroupListByProId', TierGroupRouteController.getTierGroupListByProId)
// app.post('/getTierGroupProfile', TierGroupRouteController.getTierGroupProfile)

//TierProfile
// app.post('/addTierProfile', TierProfileRouteController.addTierProfile)
// app.post('/editTierProfile', TierProfileRouteController.editTierProfile)
// app.post('/deleteTierProfile', TierProfileRouteController.deleteTierProfile)

//CosProfile
// app.post('/getCosProfile', CosProfileRouteController.getCosProfile)
// app.post('/addCosProfile', CosProfileRouteController.addCosProfile)
// app.post('/editCosProfile', CosProfileRouteController.editCosProfile)
// app.post('/deleteCosProfile', CosProfileRouteController.deleteCosProfile)

//ZoneSetting
// app.post('/getZoneSetting', ZoneSettingRouteController.getZoneSetting)
// app.post('/addZoneSetting', ZoneSettingRouteController.addZoneSetting)
// app.post('/editZoneSetting', ZoneSettingRouteController.editZoneSetting)
// app.post('/deleteZoneSetting', ZoneSettingRouteController.deleteZoneSetting)

//ResetCycle
// app.post('/getResetCycle', ResetCycleRouteController.getResetCycle)
// app.post('/addResetCycle', ResetCycleRouteController.addResetCycle)
// app.post('/editResetCycle', ResetCycleRouteController.editResetCycle)
// app.post('/deleteResetCycle', ResetCycleRouteController.deleteResetCycle)

//DPISetting
// app.post('/getDPISetting', DPISettingRouteController.getDPISetting)
// app.post('/addDPISetting', DPISettingRouteController.addDPISetting)
// app.post('/editDPISetting', DPISettingRouteController.editDPISetting)
// app.post('/deleteDPISetting', DPISettingRouteController.deleteDPISetting)
// app.post('/getDPIName', DPISettingRouteController.getDPIName)

// //SMSTemplate
// app.post('/getSMSTemplate', SMSTemplateRouteController.getSMSTemplate)
// app.post('/addSMSTemplate', SMSTemplateRouteController.addSMSTemplate)
// app.post('/editSMSTemplate', SMSTemplateRouteController.editSMSTemplate)
// app.post('/deleteSMSTemplate', SMSTemplateRouteController.deleteSMSTemplate)

// //PlmnManagement
// app.post('/getPlmnManagement',PlmnManagementRouteController.getPlmnManagement)
// app.post('/addPlmnManagement', PlmnManagementRouteController.addPlmnManagement)
// app.post('/editPlmnManagement', PlmnManagementRouteController.editPlmnManagement)
// app.post('/deletePlmnManagement', PlmnManagementRouteController.deletePlmnManagement)

// //CountryManagement
// app.post('/getCountryManagement',CountryManagementController.getCountryManagement)
// app.post('/addCountryManagement', CountryManagementController.addCountryManagement)
// app.post('/editCountryManagement', CountryManagementController.editCountryManagement)
// app.post('/deleteCountryManagement', CountryManagementController.deleteCountryManagement)
// app.post('/getCosPolicy', CountryManagementController.getCosPolicy)

// //WhiteList
// app.post('/getWhitelist', SubscriberRouteController.getWhitelist)
// app.post('/addWhitelist', SubscriberRouteController.addWhitelist)
// app.post('/editWhitelist', SubscriberRouteController.editWhitelist)
// app.post('/deleteWhitelist', SubscriberRouteController.deleteWhitelist)
// app.post('/getIMSIsub', SubscriberRouteController.getIMSIsub)

// //Blacklist
// app.post('/getBlacklist', SubscriberRouteController.getBlacklist)
// app.post('/addBlacklist', SubscriberRouteController.addBlacklist)
// app.post('/editBlacklist', SubscriberRouteController.editBlacklist)
// app.post('/deleteBlacklist', SubscriberRouteController.deleteBlacklist)


// //DataPlan
// app.post('/getDataplan', DataPlanRouteController.getDataplan)
// app.post('/getDataplanAll', DataPlanRouteController.getDataplanAll)
// app.post('/getDataplanVisit', DataPlanRouteController.getDataplanVisit)
// app.post('/getDataplanImsi', DataPlanRouteController.getDataplanImsi)

// //AccumulateUsage
// app.post('/getAccumulateUsage', AccumulateUsageRouteController.getAccumulateUsage)
// app.post('/getAccumulateUsageAll', AccumulateUsageRouteController.getAccumulateUsageAll)
// app.post('/getIMSIMSISDN', AccumulateUsageRouteController.getIMSIMSISDN)
// app.post('/getresetusage', AccumulateUsageRouteController.getresetusage)


// //ActiveSession
// app.post('/getActiveSession', ActiveSessionRouteController.getActiveSession)
// app.post('/getActiveSessionALL', ActiveSessionRouteController.getActiveSessionALL)
// app.post('/getActiveSessionVisit', ActiveSessionRouteController.getActiveSessionVisit)
// app.post('/getActiveSessionIMSI', ActiveSessionRouteController.getActiveSessionIMSI)

// //HistorySession
// app.post('/getHistorySession', HistorySessionRouteController.getHistorySession)

// //Report
// // app.get('/getSubscribersReport', ReportRouteController.getSubscribersReport)
// // app.get('/getSessionReport', ReportRouteController.getSessionReport)
// // app.get('/getAverageReport', ReportRouteController.getAverageReport)
// // app.get('/getProfileReport', ReportRouteController.getProfileReport)
// // app.get('/getPolicyReport', ReportRouteController.getPolicyReport)
// app.post('/getOnlinetSubscriber', ReportRouteController.getOnlinetSubscriber)
// app.post('/getAverageThroughput', ReportRouteController.getAverageThroughput)
// app.post('/getIBPolicy', ReportRouteController.getIBPolicy)
// app.post('/getOBPolicy', ReportRouteController.getOBPolicy)

// //Traffic Report
// // app.post('/getALLOBdailytrafficreport',TrafficRouteController.getALLOBdailytrafficreport)
// app.post('/getOBdailytrafficreport',TrafficRouteController.getOBdailytrafficreport)
// app.post('/getIBdailytrafficreport',TrafficRouteController.getIBdailytrafficreport)
// app.post('/getOBmonthlytrafficreport',TrafficRouteController.getOBmonthlytrafficreport)
// app.post('/getIBmonthlytrafficreport',TrafficRouteController.getIBmonthlytrafficreport)
// app.post('/getOutboundPolicyOption',TrafficRouteController.getOutboundPolicyOption)
// app.post('/getInboundPolicyOption',TrafficRouteController.getInboundPolicyOption)
// app.post('/getPolicyOption',TrafficRouteController.getPolicyOption)

// //CosTierReport
// app.post('/getDailyCOSTierReport',CosTierReportController.getDailyCOSTierReport)
// app.post('/getMonthlyCOSTierReport',CosTierReportController.getMonthlyCOSTierReport)
// app.post('/getControlProfileRecord',CosTierReportController.getControlProfileRecord)
// app.post('/getTierListRecord',CosTierReportController.getTierListRecord)

//PDPReport
// app.post('/getOBDailyPDPReport',PDPReportController.getOBDailyPDPReport)
// app.post('/getIBDailyPDPReport',PDPReportController.getIBDailyPDPReport)
// app.post('/getDailyPDPReport',PDPReportController.getDailyPDPReport)

//Report KW
// app.post('/getDailyTrafficReport', ReportController.getDailyTrafficReport)
// app.post('/getMonthlyTrafficReport', ReportController.getMonthlyTrafficReport)
// app.post('/getDailyCOSTierReport', ReportController.getDailyCOSTierReport)
// app.post('/getMonthlyCOSTierReport', ReportController.getMonthlyCOSTierReport)

// app.post('/generateOnlineReport', ReportELKController.generateOnlineReport)
// app.post('/generateTrafficReport', ReportELKController.generateTrafficReport)
// app.post('/generateTrafficMonthlyReport', ReportELKController.generateTrafficMonthlyReport)
// app.post('/generateCOSReport', ReportELKController.generateCOSReport)
// app.post('/generateCOSMonthlyReport', ReportELKController.generateCOSMonthlyReport)
// app.post('/generatePDPReport', ReportELKController.generatePDPReport)
// app.post('/generatePDPFailureReport', ReportELKController.generatePDPFailureReport)
// app.post('/generateIMSIReport', ReportELKController.generateIMSIUsageReport)
// app.post('/generateIMSIUsageReport', ReportELKController.generateIMSIUsageReport)
// app.post('/generateIMSITimeseriesReport', ReportELKController.generateIMSITimeseriesReport)


//System Audit Trail
// app.post('/getSystemAudit', SystemAuditTrailController.getSystemAudit)

//Alarm 
// app.post('/getAlarm', AlarmRouteController.getAlarm)
// app.post('/editAlarm', AlarmRouteController.editAlarm)
// app.post('/getSeverityOption', AlarmRouteController.getSeverityOption)
// app.post('/getCategory', AlarmRouteController.getCategory)
// app.post('/getSeverity', AlarmRouteController.getSeverity)
// app.post('/editSeverity', AlarmRouteController.editSeverity)
// app.post('/getSeverityEmailById', AlarmRouteController.getSeverityEmailById)

// app.post('/addEmailAddress', AlarmRouteController.addEmailAddress)
// app.post('/editEmailAddress', AlarmRouteController.editEmailAddress)
// app.post('/deleteEmailAddress', AlarmRouteController.deleteEmailAddress)
// Add this to the VERY top of the first file loaded in your app
var apm = require('elastic-apm-node').start({

  // Override the service name from package.json
  // Allowed characters: a-z, A-Z, 0-9, -, _, and space
  serviceName: 'testing',
  
  // Use if APM Server requires a secret token
  secretToken: '',
  
  // Set the custom APM Server URL (default: http://localhost:8200)
  serverUrl: 'http://localhost:8200',
  
  // Set the service environment
  environment: 'production'
  })

// ReportELKController.startReportCron()


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  let paths = req.path.split('/')
  let tag = paths.length > 0 ? paths[paths.length -1] : ''

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    res.send({
      errorCode: "002",
      errorMessage: "API format incorrect",
    });
    return 
  }

  // log.logTrans(req.tid, err.message);
  let errorMessage
  if(err.stack) {
    errorMessage = err.stack
  } else {
    try {
      errorMessage = JSON.stringify(err)
    } catch(e) {
      errorMessage = err
    }
  }
  log.logError(req.tid, tag, errorMessage);

  // render the error page
  res.status(err.status || 500).send(err.message);
});
app.use(function (req, res, next) {
  res.status(404).send('not found');
});


process.on('uncaughtException', function(err) {
  console.error(err);
});



if(conf.debug) {
const { exec } = require("child_process");
// exec("curl -d 'dateFrom=2020-11-01&report=1' http://127.0.0.1:9020/generateIMSIUsageReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27&dateTo=2020-09-28&limit=20' http://127.0.0.1:9020/generateIMSIUsageReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27&dateTo=2020-09-27&interval=1d' http://127.0.0.1:9020/generateIMSITimeseriesReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27&dateTo=2020-09-28&interval=1d&imsi=454120380300699' http://127.0.0.1:9020/generateIMSITimeseriesReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generateOnlineReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generateTrafficReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generateTrafficMonthlyReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generateCOSReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generateCOSMonthlyReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generatePDPReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-09-27' http://127.0.0.1:9020/generatePDPFailureReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'hashnum=4&imsi=525016107307604' http://127.0.0.1:9020/getHistorySession")//.stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-07-08&type=OB&hplmn=45402&policy=32' http://127.0.0.1:9020/getDailyTrafficReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-07-08&type=OB&hplmn=1&policy=32&vplmn=45402' http://127.0.0.1:9020/getMonthlyTrafficReport").stdout.on('data', data => console.log(data))
// exec("curl -d 'dateFrom=2020-08-14' http://127.0.0.1:9020/generateCOSReport").stdout.on('data', data => console.log(data))
}