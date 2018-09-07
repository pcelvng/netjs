const net = require("../net.js");
const util = require('util');

let uploadSpeedOptions = {
    uploadUrl: "", // if empty will not perform an upload speed test
    // uploadContentType: "", // default is "application/octet-stream" // NEEDED???
    uploadSize: 1000, // upload size in bytes. The test will upload a random string of bytes of length uploadSize.
    uploadTimeout: 5, // timeout after specified seconds
};

// upload speed over http
net.httpUpSpeed(uploadSpeedOptions).then(
    stInfo => {
        console.log(util.inspect(stInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err network info: " + err.toString());
    }
);

let downloadSpeedOptions = {
    downloadUrl: "", // if empty will not performa a download speed test
    downloadContentType: "", // default is "application/octet-stream" // NEEDED???
    downloadTimeout: 5, // timeout after specified seconds
};

// download speed over http
net.httpDownSpeed(downloadSpeedOptions).then(
    stInfo => {
        console.log(util.inspect(stInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err network info: " + err.toString());
    }
);