const net = require("../net.js");
const util = require('util');

net.networkInfo().then(
    nInfo => {
        console.log(util.inspect(nInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err network info: " + err.toString());
    }
);