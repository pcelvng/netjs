const net = require("../net.js");
const util = require('util');

// reverseDns on google's dns server
net.reverseDns("8.8.8.8").then(
    hostNames => {
        // 'google-public-dns-a.google.com'
        console.log(util.inspect(hostNames, false, null, true));
    }
).catch(
    err => {
        console.log("err reverseDns: " + err.toString());
    }
);

// if no value provided then the promise is still resolved
// with hostNames === [].
net.reverseDns("").then(
    hostNames => {
        // []
        console.log(util.inspect(hostNames, false, null, true));
    }
).catch(
    err => {
        console.log("err reverseDns: " + err.toString());
    }
);

// if no hostNames are found then the value of hostNames is 'undefined'.
net.reverseDns("127.0.0.1").then(
    hostNames => {
        // []
        console.log(util.inspect(hostNames, false, null, true));
    }
).catch(
    err => {
        console.log("err reverseDns: " + err.toString());
    }
);