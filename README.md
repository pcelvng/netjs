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

### clientinfo example

```js
const net = require("../net.js");
const util = require('util');

net.clientInfo().then(cInfo => {
    console.log(util.inspect(cInfo, false, null, true));
}).catch(error => {
    console.log("client info error: " + error.toString());
});
```

### gateway example

```js
const net = require("../net.js");
const util = require('util');

// defaultGateway provides the default gateway as reported by the client
// os.
// The default gateway will not attempt to understand if it is also
// the internet gateway and will therefore not have the 'Gateway' role.
// Maybe this will get added in a future version.
net.defaultGateway().then(
    dgwInfo => {
        console.log(util.inspect(dgwInfo, false, null, true));
    }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);

// clientGateway will provide the first gateway on the
// way out to the internet. It will likely be the only
// gateway on the way out unless the network has more
// than one NAT going out to the internet.
//
// if the clientGateway is also the internet gateway
// then the 'Gateway' role will also be present.
net.clientGateway().then(
  cgwInfo => {
      console.log(util.inspect(cgwInfo, false, null, true));
  }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);

// internetGateway will return the gateway to the internet.
// If the local network has more than one NAT then this will
// be different than the client gateway.
net.internetGateway().then(
    igwInfo => {
        console.log(util.inspect(igwInfo, false, null, true));
    }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);

// gateways returns all gateway on the way out to the internet.
net.gateways().then(
    gws => {
        console.log(util.inspect(gws, false, null, true));
    }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);
```

### httpchecks example

```js
let net = require("../net.js");

// can reach destination
net.httpCheck("http://www.google.com:80").then(
    destination => {
        if (destination.length > 0) {
            console.log("success at destination: " + destination);
        } else {
            console.log("destination was not reached");
        }
    }
).catch(
    err => {
        console.log("err at destination: " + err.toString());
    }
);

// cannot reach destination - still comes
// back as successful but the destination value
// is empty.
net.httpCheck("http://www.google.com:8000").then(
    destination => {
        if (destination.length > 0) {
            console.log("success at destination: " + destination);
        } else {
            console.log("destination was not reached");
        }
    }
).catch(
    err => {
        console.log("err at destination: " + err.toString());
    }
);

// multiple destinations
// notice that the destination that was not reached is left out.
net.httpChecks(["http://www.google.com","http://yahoo.com:80","http://www.google.com:8000"]).then(
    destinations => {
        if (destinations.length > 0) {
            console.log("success at destinations: " + destinations);
        } else {
            console.log("no destinations were reached");
        }
    }
).catch(
    err => {
        console.log("err at destinations: " + err.toString());
    }
);
```

### localnodes example

```js
const net = require("../net.js");
const util = require('util');

// localNodes provides a list of all local network
// nodes. If the network has more than one outgoing
// NAT then localNodes will only provide the local
// nodes in the immediate 'innermost' client network.
//
// At the moment, represents the same values that are stored in
// the clients arp table.
net.localNodes().then(
    lNodes => {
        console.log(util.inspect(lNodes, false, null, true));
    }
).catch(
    err => {
        console.log("local nodes err: " + err.toString());
    }
);
```

### networkinfo example

```js
const net = require("../net.js");
const util = require('util');

net.networkInfo().then(
    nInfo => {
        console.log(util.inspect(nInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err network info: " + err.toString());
    }
);
```

### ping/pings example

```js
const net = require("../net.js");
const util = require('util');

net.ping("www.google.com").then(pingResults => {
    console.log(util.inspect(pingResults, false, null, true));
}).catch(error => {
    console.log("ping error: " + error.toString());
});

let pingsOptions = {
    address: 'www.google.com',
    numPings: 3,
};

net.pings(pingsOptions).then(pingResults => {
    console.log(util.inspect(pingResults, false, null, true));
}).catch(error => {
    console.log("ping error: " + error.toString());
});
```

### reversedns example

```js
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
```

### speedtest example

```js
const net = require("../net.js");
const util = require('util');

// speed test options
let stOptions = {
    progressCb: progress => {
        console.log("progress... " + util.inspect(progress, false, null, true));
    },
};

// speed test is, for now, a simple wrapper around the awesome
// speedtest-net library. In the future it is possible there will be support
// for other speed test libraries as well as adding more options
// and normalizing the results to be independent of the underlying
// test driver.
net.speedTest(stOptions).then(
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

// can provide dns host name
net.traceroute("www.google.com").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// can provide ip host name
net.traceroute("8.8.8.8").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// err if nothing is provided
net.traceroute("").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);

// err if not a valid destination
net.traceroute("blah.blah.blah").then(
    trInfo => {
        console.log(util.inspect(trInfo, false, null, true));
    }
).catch(
    err => {
        console.log("err traceroute: " + err.toString());
    }
);
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
