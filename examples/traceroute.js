const net = require("../net.js");
const util = require('util');

net.traceroute("8.8.8.8").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);