const net = require("../net.js");
const util = require('util');

// speed test options
let stOptions = {
    progressCb: progress => {
        console.log("progress... " + util.inspect(progress, false, null, true));
    },
};

// download speed over http
net.speedTest(stOptions).then(
    stResult => {
        console.log(util.inspect(stResult, false, null, true));
    }
).catch(
    err => {
        console.log("err speedTest: " + err.toString());
    }
);