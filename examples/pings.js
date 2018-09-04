let net = require("../net.js");

let pingsOptions = {
    address: 'www.google.com',
    numPings: 3,
};

net.pings(pingsOptions).then(results => {
    console.log("results.numPings: " + results.numPings);
    console.log("results.packetSize: " + results.packetSize);
    console.log("results.host: " + results.host);
    console.log("results.ip: " + results.ip);
    for (let i = 0; i < results.pings.length; i++) {
        console.log("results.pings[" + i + "].start: '" + results.pings[i].start.toISOString() + "' results.pings[" + i + "].return: '" + results.pings[i].return.toISOString() + "'");
    }
}).catch(error => {
    console.log("ping error: " + error.toString());
});
