const net = require("../net.js");
const util = require('util');
const ip = require('ip');

// net.localNodes().then(
//     lNodes => {
//         console.log(util.inspect(lNodes, false, null, true));
//     }
// ).catch(
//     err => {
//         console.log("err network info: " + err.toString());
//     }
// );

// console.log("isPrivate: " + ip.isPrivate('96.120.96.217'));

// const netAddress = require('address');

const ping = require('net-ping');

function doneCb (error, target) {
    if (error)
        console.log (target + ": " + error.toString ());
    else
        console.log (target + ": Done");
}

function feedCb (error, target, ttl, sent, rcvd) {
    var ms = rcvd - sent;
    if (error) {
        if (error instanceof ping.TimeExceededError) {
            console.log (target + ": " + error.source + " (ttl="
                + ttl + " ms=" + ms +")");
        } else {
            console.log (target + ": " + error.toString ()
                + " (ttl=" + ttl + " ms=" + ms +")");
        }
    } else {
        console.log (target + ": " + target + " (ttl=" + ttl
            + " ms=" + ms +")");
    }
}

let options = {
    networkProtocol: ping.NetworkProtocol.IPv4,
    packetSize: 16,
    retries: 1,
    sessionId: (process.pid % 65535),
    timeout: 3000,
    ttl: 128
};
let session = ping.createSession(options);
session.traceRoute ("8.8.8.8", 10, feedCb, doneCb);