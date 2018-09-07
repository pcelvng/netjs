const net = require("../net.js");
const util = require('util');

// localNodes provides a list of all local network
// nodes. If the network has more than one outgoing
// NAT then localNodes will only provide the local
// nodes in the immediate 'innermost' client network.
//
// At the moment, represents the same values that are stored in
// the clients arp table.
net.localNodes().then(
    lNodes => {
        console.log(util.inspect(lNodes, false, null, true));
    }
).catch(
    err => {
        console.log("local nodes err: " + err.toString());
    }
);