const net = require("../net.js");
const util = require('util');

// generate all localnetwork objects including
// and especially the core local network hosts.
net.localNetwork((hsts) => {
    for (let i = 0; i < hsts.length; i++) {
        console.log(util.inspect(hsts[i], false, null, true));
    }
});