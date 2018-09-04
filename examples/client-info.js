let net = require("../net.js");

net.clientInfo().then(info => {
    console.log("info.mac: " + info.mac);
    console.log("info.internalIp: " + info.internalIp);
    console.log("info.publicIp: " + info.publicIp);
}).catch(error => {
   console.log("client info error: " + error.toString());
});