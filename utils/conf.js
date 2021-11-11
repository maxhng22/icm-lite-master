const fs = require('fs');

const confString = fs.readFileSync('./conf/app.conf').toString();
var conf = {};

confString.replace(/\r/g, '').split('\n').forEach((c, index) => {
    if (c.trim() !== '' && c.trim()[0] !== '#') {
        c = c.trim().split(/=(.+)/);
        if (c[1].trim() === 'true' || c[1].trim() === 'false') {
            conf[c[0].trim()] = (c[1].trim() == 'true');
        } else if (/^\d+$/.test(c[1].trim())) {
            conf[c[0].trim()] = parseInt(c[1].trim());
        } else {
            conf[c[0].trim()] = c[1].trim().replace(/"/g, '').toString();
        }
    }
});

module.exports = conf;