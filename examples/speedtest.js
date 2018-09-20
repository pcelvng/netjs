const net = require("../net.js");
const util = require('util');

// speed test options
let stCfg = {
    progressCb: progress => {
        console.log("progress... " + util.inspect(progress, false, null, true));
    },
};

// speed test is, for now, a simple wrapper around the awesome
// speedtest-net library. In the future it is possible there will be support
// for other speed test libraries as well as adding more options
// and normalizing the results to be independent of the underlying
// test driver.
net.speed(stCfg).then(
    stResult => {
        console.log(util.inspect(stResult, false, null, true));
    }
).catch(
    err => {
        console.log("err speedTest: " + err.toString());
    }
);