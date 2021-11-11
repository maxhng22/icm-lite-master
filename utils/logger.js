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
var async = require("async")
var path = require('path');

const conf = require('../utils/conf.js');

var version = 'unknown';
var fileDir = './';		//directory to write file to
var filename = '';		//temp file name (includes dir after it is generated)
var filenamePrefix = '';//starting portion of archive log name 
var filenameSuffix = '';//extention of archive log name
var filesize = 10;		//maximum archived file in mb
var transaction_id_length = 15;
var module_id_length = 5;
var currentDate = '';	//*reminder: make sure this remains a string~!

var ERR = 'ERR';

//timer
//var ticker = setInterval(tickCallback, 1000);  //1000 = 1 sec

/****************************************
 *  Starts
 ****************************************/

let hasInitializeLog = false
function init(version, logPath, logName, logExtension, logSize, transactionIdLength, moduleIdLength) {

	version = version;
	fileDir = logPath;
	filenamePrefix = logName;
	filenameSuffix = logExtension;
	filesize = logSize;
	transaction_id_length = transactionIdLength;
	module_id_length = moduleIdLength

	if (!hasInitializeLog) {
		hasInitializeLog = new appLog(version, fileDir, filenamePrefix, filenameSuffix, filesize, transaction_id_length, module_id_length);		// Initialize logger if no instance have been initialize	
	}
}

// class/*
function appLog(configVersion, configFileDir, configFilenamePrefix, configFilenameSuffix, configFilesize, configTransactionIdLength, configModuleIdLength) {
	if (configTransactionIdLength) {
		transaction_id_length = configTransactionIdLength; // number of characters to pad
	}
	if (configVersion) {
		version = configVersion; // number of characters to pad
	}
	if (configModuleIdLength) {
		module_id_length = configModuleIdLength;
	}
	loadConfig(configFileDir, configFilenamePrefix, configFilenameSuffix, configFilesize);

}

//test timer
function tickCallback() {
	handleLogFile();
}

function formatMessage(dir, log_level, transaction_id, transaction_id_length, module_id, module_id_length, msg) {

	msg = msg || ''
	if (typeof msg === 'string') {
	} else if (typeof msg === 'object') {
		msg = JSON.stringify(msg)
	}

	var message = '';

	var padded_log_level = pad(log_level, 3, 'RIGHT', ' ');
	var padded_transaction_id;
	var padded_module_id;

	// if ( transaction_id.length <= transaction_id_length ) { 
	// 	padded_transaction_id = pad(transaction_id, transaction_id_length, 'RIGHT', ' ');
	// } else {
	// 	padded_transaction_id = transaction_id.substring(0, transaction_id_length);
	// } 
	// if ( module_id.length <= module_id_length ) { 
	// 	padded_module_id = pad(module_id, module_id_length, 'RIGHT', ' ');  
	// } else {
	// 	padded_module_id = module_id.substring(0, module_id_length);
	// }
	padded_transaction_id = pad(String(transaction_id || ''), transaction_id_length, 'RIGHT', ' ');
	padded_module_id = pad(String(module_id || ''), module_id_length, 'RIGHT', ' ');

	var formatted_transaction_id = '[' + padded_log_level + ']' + '[' + padded_transaction_id + ']' + '[' + padded_module_id + ']';
	if (dir == MsgDirEnum.IN) {

		message = getDateTime() + ' ' + formatted_transaction_id + '[->] ' + msg;

	} else if (dir == MsgDirEnum.OUT) {

		message = getDateTime() + ' ' + formatted_transaction_id + '[<-] ' + msg;

	} else {

		message = getDateTime() + ' ' + formatted_transaction_id + '[--] ' + msg;
	}

	return message;
}

//appLog.prototype.init = function(configFilenamePrefix, configFilenameSuffix, configFilesize) {
//    loadConfig(configFilenamePrefix, configFilenameSuffix, configFilesize);
//}

// class method
async function log(...parameter) {
	if (parameter.length === 1) {
		logMessage(formatMessage(MsgDirEnum.NONE, " ", " ", transaction_id_length, " ", module_id_length, parameter[0]));
		return
	}
	if (parameter.length === 2) {
		logMessage(formatMessage(MsgDirEnum.NONE, " ", " ", transaction_id_length, parameter[0], module_id_length, parameter[1]));
		return
	}
	if (parameter.length === 3) {
		logMessage(formatMessage(MsgDirEnum.NONE, " ", parameter[0], transaction_id_length, parameter[1], module_id_length, parameter[2]));
		return
	}
	if (parameter.length === 4) {
		logMessage(formatMessage(parameter[0] === undefined ? MsgDirEnum.NONE : parameter[0], " ", parameter[1], transaction_id_length, parameter[2], module_id_length, parameter[3]));
		return
	}
	if (parameter.length === 5) {
		logMessage(formatMessage(parameter[0] === undefined ? MsgDirEnum.NONE : parameter[0], parameter[1], parameter[2], transaction_id_length, parameter[3], module_id_length, parameter[4]));
		return
	}
}

async function logIn(...parameter) {
	log(MsgDirEnum.IN, ...parameter)
}

async function logOut(...parameter) {
	log(MsgDirEnum.OUT, ...parameter)
}

async function logError(...parameter) {
	log(MsgDirEnum.NONE, ERR, ...parameter)
}


let trimLog = !conf.debug
trimLog = true
var logStream
async function logMessage(text) {
	if (hasInitializeLog) {
		if(text.length > 1000) {
			if(trimLog) {
				text = text.substring(0, 1000) + '...[' + text.length + ']'
			}
		}
		console.log(text);
		await handleLogFile();
		// fq.appendFile(filename, text + '\n', function (err) {
		// 	if (err) {
		// 		throw err;
		// 	}
		// });

		// var logStream = fs.createWriteStream(filename, {flags: 'a'});
		logStream.write(text + '\n');
		// logStream.end();

		// queue.push(text)
	} else {
		console.log('appLog is not initialized');
	}
}



function getDateTime() {

	var date = new Date();

	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;

	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;

	var sec = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;

	var msec = date.getMilliseconds();
	if (msec < 10) { msec = (msec < 10 ? "00" : "") + msec; }
	else if (msec < 100) { msec = (msec < 100 ? "0" : "") + msec; }

	var year = date.getFullYear();

	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;

	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;

	//return year + ":" + month + ":" + day + " " + hour + ":" + min + ":" + sec + "." + msec;
	return year + month + day + " " + hour + ":" + min + ":" + sec + "." + msec;
}

function getRawDateTime() {

	var date = new Date();

	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;

	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;

	var sec = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;

	var msec = date.getMilliseconds();
	if (msec < 10) { msec = (msec < 10 ? "00" : "") + msec; }
	else if (msec < 100) { msec = (msec < 100 ? "0" : "") + msec; }

	var year = date.getFullYear();

	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;

	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;

	return year + "" + month + "" + day + "" + hour + "" + min + "" + sec + "" + msec;
}


function formDate() {
	var newDate = '';
	var date = new Date();

	//year  
	var year = date.getFullYear();
	//year = year.toString().slice(2);
	newDate += year;   //'filename_yyyy'
	//month
	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	newDate += month;   //'yyyymm'
	//day
	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;
	newDate += day;   //'yyyymmdd'

	//if(newDate>currentDate){
	//	currentDate = newDate;
	//}
	return newDate;
}


/*
function generateName(filename){
	var name  = filename + '_';		//'fileName_'
	var date = new Date();
	
	//var newstr = oristr.substr(3);
	
	//boss_yymmddhhmm_000.log
	
	var year = date.getFullYear();
	year = year.substr(2);
	String.format("%05d", year);
	name += year;
}*/

//################################# new functions
//generates the new name for file to be archived
//(3)
function generateName(filenamePrefix, filenameSuffix) {    //called when full
	var name = '';

	//section 1     //'fileName_'
	var sec1 = '';
	sec1 += fileDir;
	sec1 += filenamePrefix;		//'fileName_'
	var date = new Date();
	name += sec1;

	name += '_';

	//section 2     //'yymmddhhmm_'
	var sec2 = '';
	//year  
	var year = date.getFullYear();
	//year = year.toString().slice(2);
	sec2 += year;   //'filename_yyyy'
	//month
	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	sec2 += month;   //'yyyymm'
	//day
	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;
	sec2 += day;   //'yyyymmdd'
	//hour 
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	sec2 += hour;   //'yyyymmddhh'
	//minute
	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	sec2 += min;   //'yyyymmddhhmm'

	name += sec2;

	name += '_';	//'filename_yyyymmddhhmm_'

	//check if need to incremenet
	var sec3 = '';
	var counter = 0;

	var files = readDir();

	for (var i in files) {
		var res = files[i].split("_");
		if (filenamePrefix == res[0]) {
			if (sec2 == res[1]) {
				if (res[2].substring(0, 3) > counter) {
					counter = res[2].substring(0, 3);
				}
			}
		}
	}

	counter++;
	sec3 = String("000" + counter).slice(-3);

	name += sec3;
	//filename_yymmddhhmm_000

	name += filenameSuffix;
	//filename_yymmddhhmm_000.log

	return name;
}


function generateNameYesterday(filenamePrefix, filenameSuffix) {    //called when full
	var name = '';

	//section 1     //'fileName_'
	var sec1 = '';
	sec1 += fileDir;
	sec1 += filenamePrefix;		//'fileName_'
	var date = new Date();
	name += sec1;

	name += '_';

	//section 2     //'yymmddhhmm_'
	var sec2 = currentDate + '2359';
	//year  

	name += sec2;

	name += '_';	//'filename_yyyymmddhhmm_'

	//check if need to incremenet
	var sec3 = '';
	var counter = 0;

	var files = readDir();

	for (var i in files) {
		var res = files[i].split("_");
		if (filenamePrefix == res[0]) {
			if (sec2 == res[1]) {
				if (res[2].substring(0, 3) > counter) {
					counter = res[2].substring(0, 3);
				}
			}
		}
	}

	counter++;
	sec3 = String("000" + counter).slice(-3);

	name += sec3;
	//filename_yymmddhhmm_000

	name += filenameSuffix;
	//filename_yymmddhhmm_000.log

	return name;
}





//generates the tempfile name
function generateTempName(filenamePrefix) {
	return fileDir + filenamePrefix + '~' + filenameSuffix;
}

//reads all files in directory
function readDir() {
	var files;

	try {
		files = fs.readdirSync(fileDir);
	} catch (error) {
		files = null;
	}

	return files;
}

//size checker should be done here
//(1)
function handleLogFile() {
	checkDateUpdate();
	checkSizeUpdate();
}

//check every time writing is done, checks when 
function checkDateUpdate() {
	var newDate = formDate();

	if (newDate > currentDate) {
		fs.rename(filename, generateNameYesterday(filenamePrefix, filenameSuffix), function (err) {
			if (err) console.log('ERROR: ' + err);
			logStream.end()
			generateTempFile(filename); //by right is not present as it has already been renamed
			logStream = fs.createWriteStream(filename, {flags: 'a'});
		});

		currentDate = newDate;
	}
	//else{console.log('unchanged');}
}

function checkSizeUpdate() {
	var rename = checkFilesize(filename, filesize);
	if (rename === true) {//file reaches XXmb
		fs.rename(filename, generateName(filenamePrefix, filenameSuffix), function (err) {
			if (err) console.log('ERROR: ' + err);
			logStream.end()
			generateTempFile(filename); //by right is not present as it has already been renamed
			logStream = fs.createWriteStream(filename, {flags: 'a'});
		});
	}
	//else{console.log('unchanged');}
}


//wil try generate the tempfile if not already present, and log something there
//(4)
function generateTempFile(filename) {
	if (fs.existsSync(fileDir + filename)) {
		generateTempFile(filename); //by right is not present as it has already been renamed
		fs.appendFile(filename, '\nVersion ' + version + '\n=============\n', function (err) {
			//if (err) return console.log(err);
		});
	}
	else {
		if (!fs.existsSync(fileDir)) {
			fs.mkdirSync(fileDir);
		}
		fs.writeFile(filename, '\nVersion ' + version + '\n=============\n', function (err) {
			//if (err) return console.log(err);
		});
	}
}


//(2)
function checkFilesize(filename, filesize) {//the actual templogfile name, mb

	var fileSizeInBytes = 0;
	var fileSizeInMegaBytes = 0;
	if (fs.existsSync(filename)) {

		var stats = fs.statSync(filename);		//get file
		fileSizeInBytes = stats["size"]		//get size
		fileSizeInMegaBytes = fileSizeInBytes / 1000000.0;    //convert to mb

		//console.log("file size is " + fileSizeInMegaBytes);
		if (fileSizeInMegaBytes >= filesize) {
			return true;	//returns true if hits maxSize
		}
		else {
			return false;	//returns false if has not yet hit maxSize
		}
	}
	else {
		console.log("file not exist! " + filename);
		return false;
	}
}



//used once, during start to find the last logged date
//*reminder: make sure this remains a string~!
function initCurrentDate() {

	//done to push the temp file (of last session which exists) to the last known write
	//*not accurate, best to get last file modification date OR read date from within file
	var latestDateFound = 0;//only check once, then store s a temp global var
	var files = readDir();
	for (var i in files) {
		var res = files[i].split("_");
		if (filenamePrefix == res[0]) {
			var obtainedDate = res[1].toString().substring(0, 8);
			obtainedDate = parseInt(obtainedDate);
			if (latestDateFound < obtainedDate) {
				latestDateFound = String(obtainedDate);	//string problem
			}
		}
	}

	if (latestDateFound <= 0)	//just update to today if no old files found
	{
		currentDate = formDate();
	}
	else {
		currentDate = latestDateFound;
	}
}

function loadConfig(configFileDir, configFilenamePrefix, configFilenameSuffix, configFilesize) {
	initCurrentDate();

	/*var str;
	str = fs.readFileSync('./log.conf','utf8',function (err,data){       //  /home/lsm/src/pts
			if(err){
					return console.log(err);
			}

	});
  
	var jsonObj = JSON.parse(str); // string to JSON object    
  
	if (jsonObj.filenamePrefix != 'undefined' && jsonObj.filenamePrefix != '') {
			filenamePrefix = jsonObj.filenamePrefix;
	}
	else{
			filenamePrefix = 'boss';   //default value
	}
  
	if (jsonObj.filenameSuffix != 'undefined' && jsonObj.filenameSuffix != '') {
			filenameSuffix = jsonObj.filenameSuffix;
	}
	else{
			filenameSuffix = '.log';   //default value
	}
  
	if(jsonObj.filesize != 'undefined' && jsonObj.filesize != '') {
			filesize = jsonObj.filesize
	}
	else{
			filesize = 10; //default value 
	}
*/
	if (configFileDir != 'undefined' && configFileDir != '') {
		fileDir = configFileDir + '/';
	}
	else {
		fileDir = './';   //default value
	}

	if (configFilenamePrefix != 'undefined' && configFilenamePrefix != '') {
		filenamePrefix = configFilenamePrefix;
	}
	else {
		filenamePrefix = 'boss';   //default value
	}

	if (configFilenameSuffix != 'undefined' && configFilenameSuffix != '') {
		filenameSuffix = configFilenameSuffix;
	}
	else {
		filenameSuffix = '.log';   //default value
	}

	if (configFilesize != 'undefined' && configFilesize != '') {
		filesize = configFilesize
	}
	else {
		filesize = 10; //default value 
	}



	//console.log('checking if we should generate a new file');
	filename = generateTempName(filenamePrefix);
	if (fs.existsSync(filename)) {
		fs.rename(filename, generateName(filenamePrefix, filenameSuffix), function (err) {
			//console.log('renaming file');
			if (err) {
				console.log('ERROR: ' + err);
			}
		});
	}
	generateTempFile(filename);

	logStream = fs.createWriteStream(filename, {flags: 'a'});
// 	queue = async.queue(function(text, callback) {
// 	console.log(text);
// 	handleLogFile();
// 	logStream.write(text + '\n', 'utf-8', () => callback());
// 	// logStream.end();
// }, conf.log_concurrent || 1000);
}


// export the class
// module.exports = appLog;


module.exports = {
	init,
	log,
	logIn,
	logOut,
	logError,
}







