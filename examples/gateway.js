const net = require("../net.js");
const util = require('util');

net.gateway().then(
  gwInfo => {
      console.log(util.inspect(gwInfo, false, null, true));
  }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);