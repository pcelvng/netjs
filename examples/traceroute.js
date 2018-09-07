const net = require("../net.js");
const util = require('util');

// can provide dns host name
net.traceroute("www.google.com").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// can provide ip host name
net.traceroute("8.8.8.8").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// err if nothing is provided
net.traceroute("").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// err if not a valid destination
net.traceroute("blah.blah.blah").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

