const net = require("../net.js");

// generate all localnetwork objects including
// and especially the core local network hosts.
net.localNetwork((lnErr, hsts) => {
    if (lnErr) {
        console.log("public host error:");
        console.log(lnErr.toString());
    }

    for (let i = 0; i < hsts.length; i++) {
        console.log(JSON.stringify(hsts[i]));
    }
});