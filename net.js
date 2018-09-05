const dns = require("dns");

const iplocation = require('iplocation');
const ping = require ("net-ping");
const network = require('network');
const arp = require('node-arp');
const publicIp = require('public-ip');
const request = require('request');

// doPings is a utility to do any number of pings.
// module.exports.pings = doPings;
// - make sure to leave the http:// or https:// off of the address. So, instead of 'https://www.google.com'
//   do 'www.google.com'. If it's not in the correct format then the callback will provide an error.
// - make sure to leave off trailing paths ie don't do 'finance.yahoo.com/portfolios' but instead 'finance.yahoo.com/'.
// - make sure to remove trailing slashes; ie don't do 'finance.yahoo.com/' but rather 'finance.yahoo.com'.
// - make sure not provide a port; ie instead of 'www.google.com:80' just do 'www.google.com'.
// - can provide just an ip address; ie '172.217.4.164' is just fine. If that's the case then the results.host and
//   results.ip will contain the same value.
function doPings(options = {host: '', ip: '', numPings: 1}, pingerCallback) {
    let pingResults = {
        numPings: 1, // default is 1
        packetSize: 64, // for now not an option.
        host: options.host, // ping host
        ip: options.ip, // ping ip

        // pings represents ping results. note that the number of pings
        // may be less than the requested numPings.
        pings: [], // array of {} with 'start' and 'return' keys whose values are Date objects.
    };

    // numPings option
    if (typeof options.numPings === 'number') {
        // numPings must at least be 1 or greater.
        if (options.numPings > 0) {
            pingResults.numPings = options.numPings;
        }
    }

    // initialize ping session
    let sessionOptions = {
        // networkProtocol: ping.NetworkProtocol.IPv4,
        packetSize: pingResults.packetSize, // default: 16
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
                pingerCallback(error, pingResults);
            } else {
                pingResults.pings.push({start: sent, return: rcvd});
                cnt++;
                if (cnt < options.numPings) {
                    // do another ping until completed.
                    pa();
                } else {
                    pingerCallback(null, pingResults);
                }
            }
        })
    };

    pa();
}

// doPingsDNS is just a simple wrapper on top of doPings
// but will do a dns lookup on the address.
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
}

function pingsPromise(pingsOptions = {}) {
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
}

// pingPromise is a simple wrapper around doPingsDNS for doing just
// one ping. Ping is simpler and preferred if the user
// just wants to do a single ping.
function pingPromise(pingAddress) {
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
}

// clientInfo contains some basic client network
// information such as the internal ip, public ip,
// and mac address of the internal ip. It may
// get expanded to include more information in the
// future.
function clientInfo() {
    let cInfo = {
        mac: "",
        ip: "",
        interfaceType: "", // wired, wireless
    };

    return new Promise(
        (resolve, reject) => {
            network.get_active_interface((err, actInterface) => {
                if (err) {
                    reject(err);
                } else {
                    cInfo.mac = actInterface.mac_address;
                    cInfo.interfaceType = actInterface.type.toLowerCase();
                    cInfo.ip = actInterface.ip_address;

                    resolve(cInfo);
                }
            })
        }
    );
}

// gateway will return the gateway ip
// and mac address. If there is a problem
// then will return as much information
// as it's able to obtain. Therefore
// there is no error but rather the
// promise is resolved with as much information
// as it can get.
function gateway() {
    let gwInfo = {
        ip: "",
        mac: ""
    };

    return new Promise(
        (resolve, reject) => {
            network.get_gateway_ip((gwErr, ip) => {
                if (gwErr) {
                    // if there is a problem, it's
                    // resolved with as much
                    // info as we could obtain.
                    // console.log("gwErr: " + gwErr.toString());
                    // resolve(gwInfo);
                    reject(gwErr);
                } else {
                    gwInfo.ip = ip;
                    arp.getMAC(ip, (macErr, mac) => {
                        if (macErr) {
                            // only able to get the ip. That's ok,
                            // just get what's possible.
                            // console.log(macErr.toString());
                            // resolve(gwInfo);
                            reject(macErr);
                        } else {
                            gwInfo.mac = mac;
                            resolve(gwInfo);
                        }
                    })
                }
            })
        }
    );
}

// networkInfo provides basic network information:
// - gateway (ip, mac)
//      - If there are multiple gateways then the default is provided.
// - public ip
// - public ip basic geo
//      - city
//      - state (region)
//      - country
//      - zip
// - isp
//
// also provides:
// - start at (when the scan started)
// - end at (when the scan completed)
// - open outgoing ports (maybe)
function networkInfo() {
    let netInfo = {
        publicIp: "",

        // basic geo
        city: "",
        state: "",
        country: "",
        zip: "",

        // ISP
        isp: "",

        // TODO: maybe add dns info, but maybe implemented in networkNodes
        // local dns
        // localDnsIp: "",
        // localDnsMac: "",

        // gateway info
        gatewayIp: "",
        gatewayMac: "",

        startAt: new Date(),
        doneAt: new Date(), // the done date is updated when complete

        // array of node objects.
        // nodeObj = {
        //  host: "", // assigned local dns host name, if available
        //  ip: "",
        //  mac: "",
        //  interface: "", // wireless, ethernet
        //  roles: [], // list of devices roles (dns, nat, router, gateway)
        // }
        // localNodes:[], // list of local devices/network nodes. array of node objects.
    };

    let getGeoInfo = new Promise(
        (resolve, reject) => {
            // get public ip first
            publicIp.v4().then(pubIp => {
                netInfo.publicIp = pubIp;

                // geo info
                iplocation(pubIp).then(geo => {
                    netInfo.city = geo.city;
                    netInfo.state = geo.region_code;
                    netInfo.country = geo.country;
                    netInfo.zip = geo.postal;
                    netInfo.isp = geo.org;

                    resolve(netInfo);
                }).catch(err => {
                    // still resolve with the info
                    // we have - public ip
                    resolve(netInfo);
                })
            }).catch(err => {
                reject(err);
            });
        }
    );

    return new Promise(
        (resolve, reject) => {
            Promise.all([getGeoInfo, gateway()]).then(
                ([gInfo, gwInfo]) => {
                    netInfo.gatewayIp = gwInfo.ip;
                    netInfo.gatewayMac = gwInfo.mac;

                    netInfo.doneAt = new Date();
                    resolve(netInfo);
                }
            ).catch(
                err => {
                    reject(err);
                }
            );
        }
    );
}

// httpCheck returns a promise for checking a single
// http(s) endpoint.
//
// Notes:
// - only supports the GET action method at the moment.
// - expects exactly a 200 response code.
// - does not follow redirects.
// - the promise is only resolved. 'reject' is not called
//   so that a single fail or bad destination doesn't get
//   in the way of other destination checks.
// - can accept http or https.
//
// should be a complete url such as
// "http://www.google.com/path?var1=value1"
// "https://www.google.com/path"
function httpCheck(destination) {
    return new Promise(
        (resolve) => {
            let reqOptions = {
                url: destination,
                method: "GET",
                timeout: 2000, // wait max 2 seconds. Note: os can override this value.
            };
            request(reqOptions).on('response', (response) => {
                if (response.statusCode === 200) {
                    // on success just sends back the checked destination
                    resolve(destination);
                } else {
                    resolve("");
                }
            }).on('error', (err) => {
                // just resolve with an empty string.
                resolve("");
            })
        }
    );
}

// httpChecks is like httpCheck for an array of destinations.
// destinations = array of http(s) destination strings.
function httpChecks(destinations) {
    return new Promise(
        (resolve) => {
            let promises = []; // array of promises
            for (let i = 0; i < destinations.length; i++) {
                promises.push(httpCheck(destinations[i]));
            }

            Promise.all(promises).then(
                (okDestinations) => {
                    // only return the non-empty destinations
                    let finalDestinations = [];
                    for (let i = 0; i < okDestinations.length; i++) {
                        if (okDestinations[i].length > 0 ) {
                            finalDestinations.push(okDestinations[i]);
                        }
                    }

                    resolve(finalDestinations);
                }
            )
        }
    )
}

module.exports.ping = pingPromise;
module.exports.pings = pingsPromise;
module.exports.clientInfo = clientInfo;
module.exports.gateway = gateway;
module.exports.networkInfo = networkInfo;
module.exports.httpCheck = httpCheck;
module.exports.httpChecks = httpChecks;

// TODO: local devices support.
// let find =  require('local-devices');
// Find all local network devices.
// module.exports.devices = find();

// TODO: add dns node support.
// const netAddress = require('address');
// module.exports.dns = netAddress.dns;