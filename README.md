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

net.gateway().then(
  gwInfo => {
      console.log(util.inspect(gwInfo, false, null, true));
  }
).catch(
    err => {
        console.log("gateway err: " + err.toString());
    }
);
```

### httpcheck example

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