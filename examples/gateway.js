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