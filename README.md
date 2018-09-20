# @pcelvng/net

@pcelvng/net is a node.js package containing a collection
of network utilities for gathering information about a 
client network environment.

## Installation

```bash
$ npm install @pcelvng/net --save
```

## Usage

All usage examples are located in the examples directory. Examples 
are reproduced below for convenience.

### corelocalnetwork example

```js
const net = require("../net.js");
const util = require('util');

// easily obtain the client host - the host where the test
// is being run.
net.clientHost((cHst) => {
    console.log("client host object: ");
    console.log(util.inspect(cHst, false, null, true));
    console.log("");
});

// get the client host along with general information about the
// client.
net.client((clnt) => {
    console.log("client host object and general client info: ");
    console.log(util.inspect(clnt, false, null, true));
    console.log("");
});

// get the network nats to discover if you have more than
// one nat.
// note: if the nat also has the 'gateway' role then
// that is the nat that is the gateway to the internet.
net.nats((nts) => {
    console.log("local network nats: ");
    console.log(util.inspect(nts, false, null, true));
    console.log("");
});

// get the internet host which is the 'public' side
// of the local nat. It's the host that has your local network
// public ip address.
// It's the only host relative to the client local network that
// is public.
// Other public hosts are designated with the 'remote' role. Meaning
// they are remote to the client's local network.
net.publicHost((pHst) => {
    console.log("public host: ");
    console.log(util.inspect(pHst, false, null, true));
    console.log("");
});

// conveniently get the entire 'core local network'
// in a single call.
net.coreLocalNetwork((hsts) => {
    console.log(util.inspect(hsts, false, null, true));
});
```

### host example

```js
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

```

### localnetwork example

```js
const net = require("../net.js");
const util = require('util');

// generate all localnetwork objects including
// and especially the core local network hosts.
net.localNetwork((hsts) => {
    for (let i = 0; i < hsts.length; i++) {
        console.log(util.inspect(hsts[i], false, null, true));
    }
});
```

### ping example

```js
const net = require("../net.js");
const util = require('util');

// do a bunch of pings
let cfg = net.newPingsCfg();
cfg.target = "www.google.com";
cfg.num_pings = 10;
net.pings(cfg, (result) => {
    console.log('do a bunch of pings and get stats');
    console.log(util.inspect(result, false, null, true));
    console.log('');
});

net.ping("www.google.com", (result) => {
    console.log('do a single ping');
    console.log(util.inspect(result, false, null, true));
    console.log('');
});

// url accessibility/liveness check
net.pingUrl("www.google.com/", (pErr, url) => {
    console.log("err since the url is not complete - poorly formed");
    if (pErr) {
        console.log(util.inspect(pErr.toString(), false, null, true));
    }
    console.log(util.inspect(url, false, null, true));
    console.log('');
});

// urls accessibility/liveness check
// an unreachable url wil simply return an empty string value
// in the returned 'urls' array. The order matches the original
// input urls order so the user can know which urls are unreachable.
net.pingUrls(["https://www.google.com/", "https://www.bad.com:8080"], (pErr, urls) => {
    console.log('check accessibility of a series of urls');
    if (pErr) {
        console.log(util.inspect(pErr.toString(), false, null, true));
    }
    console.log(util.inspect(urls, false, null, true));
    console.log('');
});

// how a bad url comes back
net.pingUrls(["https://www.google.com/", "www.bad.com"], (pErr, urls) => {
    console.log('poorly formed url will come back as empty when presented with a group of urls');
    // improperly formed url will result in err.
    if (pErr) {
        console.log(util.inspect(pErr.toString(), false, null, true));
    }
    console.log(util.inspect(urls, false, null, true));
    console.log('');
});
```

### speedtest example

```js
const net = require("../net.js");
const util = require('util');

// speed test options
let stCfg = {
    progressCb: progress => {
        console.log("progress... " + util.inspect(progress, false, null, true));
    },
};

// speed test is, for now, a simple wrapper around the awesome
// speedtest-net library. In the future it is possible there will be support
// for other speed test libraries as well as adding more options
// and normalizing the results to be independent of the underlying
// test driver.
net.speed(stCfg).then(
    stResult => {
        console.log(util.inspect(stResult, false, null, true));
    }
).catch(
    err => {
        console.log("err speedTest: " + err.toString());
    }
);
```

### traceroute example

```js
const net = require("../net.js");
const util = require('util');

// traceroute
let destination = net.newHost();
destination.name = "www.google.com";

net.traceroute(destination, (err, hops) => {
    console.log(util.inspect(hops, false, null, true));
});

```

## Special Thanks

Special thanks to all the great libraries that this project directly relies on. 

- ip
- iplocation
- local-devices
- net-ping
- network
- node-arp
- public-ip
- speedtest-net
- request
