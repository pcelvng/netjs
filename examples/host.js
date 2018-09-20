const net = require("../net.js");
const util = require('util');

// hosts are represented by host objects.
// generate a host object yourself like this:
let myHost = net.newHost();

// you can set your host information and then augment it will various
// host functions.
myHost.name = 'www.google.com';

// with just a host do an ip lookup
// note: the 'myHost' in the callback is a reference
// to the same object.
net.hostIpLookup(myHost, (myHost) => {
    console.log("myHost with ip address: ");
    console.log(util.inspect(myHost, false, null, true));

    // with the ip address in, hand do an ip geo lookup
    net.hostGeoLookup(myHost, (myHost) => {
       console.log("myHost with geo info: ");
       console.log(util.inspect(myHost, false, null, true));
    });
});

// if you have an ip and want to find the host name
// do a host name lookup. Can also work with private
// ips if the local network has dns servers and
// the private host has a dns host name.
let h = net.newHost();
h.ip = "8.22.12.170"; // probably need to update the example with an ip that has a host name.
h.is_public = true;

net.hostNameLookup(h, (hst) => {
    console.log("host name lookup:");
    console.log(util.inspect(hst, false, null, true));
});

// if you have a host interface mac address then perform
// a vendor string lookup (note: rate limited to 1 per second)
let macHost = net.newHost();
macHost.mac = '8c:85:90:cd:ba:0e';

// note: the 'macHost' in the callback is a reference
// to the same object.
net.hostVendorLookup(macHost, (macHost) => {
   console.log("mac address vendor lookup: ");
   console.log(util.inspect(macHost, false, null, true));
});
