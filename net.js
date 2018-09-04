const dns = require("dns");

const ping = require ("net-ping");
const publicIp = require('public-ip');
const netAddress = require('address');

function doPings(options = {host: '', ip: '', numPings: 1}, pingerCallback) {
    let results = {
        numPings: 1, // default is 1
        packetSize: 64, // for now not an option.
        host: options.host,
        ip: options.ip,

        // pings represents ping results. note that the number of pings
        // may be less than the requested numPings.
        pings: [], // array of {} with 'start' and 'return' keys whose values are Date objects.
    };

    // numPings option
    if (typeof options.numPings === 'number') {
        // numPings must at least be 1 or greater.
        if (options.numPings > 0) {
            results.numPings = options.numPings;
        }
    }

    // initialize ping session
    let sessionOptions = {
        // networkProtocol: ping.NetworkProtocol.IPv4,
        packetSize: results.packetSize, // default: 16
        retries: 0, // if not 0 then there appears to be weird side effects
        // sessionId: (process.pid % 65535),
        // timeout: 2000,
        // ttl: 128
    };
    let session = ping.createSession(sessionOptions);

    let cnt = 0;
    let pa = () => {
        session.pingHost(options.ip, (error, target, sent, rcvd) => {
            if (error) {
                pingerCallback(error, results);
            } else {
                results.pings.push({start: sent, return: rcvd});
                cnt++;
                if (cnt < options.numPings) {
                    // do another ping until completed.
                    pa();
                } else {
                    pingerCallback(null, results);
                }
            }
        })
    };

    pa();
}

// pings is a utility to do any number of pings.
// module.exports.pings = doPings;
// - make sure to leave the http:// or https:// off of the address. So, instead of 'https://www.google.com'
//   do 'www.google.com'. If it's not in the correct format then the callback will provide an error.
// - make sure to leave off trailing paths ie don't do 'finance.yahoo.com/portfolios' but instead 'finance.yahoo.com/'.
// - make sure to remove trailing slashes; ie don't do 'finance.yahoo.com/' but rather 'finance.yahoo.com'.
// - make sure not provide a port; ie instead of 'www.google.com:80' just do 'www.google.com'.
// - can provide just an ip address; ie '172.217.4.164' is just fine. If that's the case then the results.host and
//   results.ip will contain the same value.
function doPingsDNS(options = {address: 'www.google.com', numPings: 1}, pingsCallback) {
    // dns lookup wrapper
    dns.lookup(options.address, (error, ip, family) => {
        // results and doPing options are the same type of object.
        let results = {
            host: '',
            ip: '',
            numPings: options.numPings,
            packetSize: options.packetSize,
        };

        if (typeof options.address === 'string') {
            results.host = options.address;
        }

        if (typeof ip === 'string') {
            results.ip = ip;
        }

        if (results.ip === '') {
            results.ip = results.host;
        }

        if (error) {
            pingsCallback(error, results);
        } else {
            doPings(results, pingsCallback);
        }
    });
};

// module.exports.pings = doPingsDNS;
module.exports.pings = (pingsOptions = {}) => {
    let pingerOptions = {
        address: "",
        numPings: 1,
    };

    if (typeof pingsOptions.address === "string") {
        pingerOptions.address = pingsOptions.address;
    }

    if (typeof pingsOptions.numPings === "number") {
        if (pingsOptions.numPings > 0) {
            pingerOptions.numPings = pingsOptions.numPings;
        }
    }

    return new Promise(
        (resolve, reject) => {
            doPingsDNS(pingerOptions, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            })
        }
    );
};

// ping is a simple wrapper around doPingsDNS for doing just
// one ping. Ping is simpler and preferred if the user
// just wants to do a single ping.
module.exports.ping = (pingAddress) => {
    let pingerOptions = {
        address: pingAddress,
    };

    return new Promise(
        (resolve, reject) => {
            doPingsDNS(pingerOptions, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            })
        }
    );
};

// clientInfo contains some basic client network
// information such as the internal ip, public ip,
// and mac address of the internal ip. It may
// get expanded to include more information in the
// future.
// clientCallback = (error, info) => {}
// info = {
//  mac: "",
//  internalIp: "",
//  publicIp: "",
// }
function clientInfo(clientCallback) {
    let info = {
        mac: "",
        internalIp: "",
        publicIp: "",
    };

    // addressPromise converts the
    let addressPromise = new Promise(
        (resolve, reject) => {
            netAddress((addrErr, addrInfo) => {
                if (addrErr) {
                    reject(addrErr);
                } else {
                    resolve(addrInfo);
                }
            });
        }
    );

    Promise.all([addressPromise, publicIp.v4()])
    .then(([addrInfo, publicIp]) => {
        info.mac = addrInfo.mac;
        info.internalIp = addrInfo.ip;
        info.publicIp = publicIp;
        clientCallback(null, info);
    })
    .catch((err) => {
        clientCallback(err, info);
    });
}

// exported client info as a promise
module.exports.clientInfo = function() {
    return new Promise(
        (resolve, reject) => {
            clientInfo((err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            })
        }
    )
};
