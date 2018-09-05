const net = require("../net.js");
const util = require('util');

net.ping("www.google.com").then(pingResults => {
    console.log(util.inspect(pingResults, false, null, true));
}).catch(error => {
    console.log("ping error: " + error.toString());
});

let pingsOptions = {
    address: 'www.google.com',
    numPings: 3,
};

net.pings(pingsOptions).then(pingResults => {
    console.log(util.inspect(pingResults, false, null, true));
}).catch(error => {
    console.log("ping error: " + error.toString());
});