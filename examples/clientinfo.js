const net = require("../net.js");
const util = require('util');

net.clientInfo().then(cInfo => {
    console.log(util.inspect(cInfo, false, null, true));
}).catch(error => {
    console.log("client info error: " + error.toString());
});
