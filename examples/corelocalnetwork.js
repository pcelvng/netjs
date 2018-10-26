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
net.publicHost((phErr, pHst) => {
    if (phErr) {
        console.log("public host error:");
        console.log(phErr.toString());
    }

    console.log("public host: ");
    console.log(util.inspect(pHst, false, null, true));
    console.log("");
});

// conveniently get the entire 'core local network'
// in a single call.
net.coreLocalNetwork((lnErr, hsts) => {
    if (lnErr) {
        console.log("local network error:");
        console.log(lnErr.toString());
    }
    console.log(util.inspect(hsts, false, null, true));
});