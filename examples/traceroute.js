const net = require("../net.js");
const util = require('util');

// traceroute
let destination = new net.Host();
destination.name = "8.8.8.8";
// destination.name = "www.google.com";

net.traceroute(destination, (err, hops) => {
    console.log(util.inspect(hops, false, null, true));
});

