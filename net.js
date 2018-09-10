const dns = require("dns");
const os = require("os");

const EventEmitter = require('events');
const ip = require('ip');
const iplocation = require('iplocation');
const localdevices =  require('local-devices');
const ping = require ("net-ping");
const network = require('network');
const arp = require('node-arp');
const publicIp = require('public-ip');
const speedtestNet = require('speedtest-net');
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

// doPingsDns is just a simple wrapper on top of doPings
// but will do a dns lookup on the address.
function doPingsDns(options = {address: '', numPings: 1}, pingsCallback) {
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
            doPingsDns(pingerOptions, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            })
        }
    );
}

// pingPromise is a simple wrapper around doPingsDns for doing just
// one ping. Ping is simpler and preferred if the user
// just wants to do a single ping.
function pingPromise(pingAddress) {
    let pingerOptions = {
        address: pingAddress,
    };

    return new Promise(
        (resolve, reject) => {
            doPingsDns(pingerOptions, (error, results) => {
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
        osUser: os.userInfo().username,
        osHostname: os.hostname(),
        osPlatform: os.platform(),
        osPlatformVersion: os.release(),
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

// defaultGateway will return the client gateway ip
// and mac address. If there is a problem
// then will return as much information
// as it's able to obtain. Therefore
// there is no error but rather the
// promise is resolved with as much information
// as it can get.
//
// If the network has more than one NAT then the
// client gateway will be different than the
// internet gateway.
function defaultGateway() {
    // gwInfo is in the same format
    // as a node object returned from the
    // localNodes function.
    let gwInfo = {
        hostName: "", // not implemented yet - but put here to be compatible with other node objects.
        ip: "",
        mac: "",
        roles: ["NAT", "Router"]
    };

    return new Promise(
        (resolve, reject) => {
            network.get_gateway_ip((gwErr, gwIp) => {
                if (gwErr) {
                    // if there is a problem, it's
                    // resolved with as much
                    // info as we could obtain.
                    // console.log("gwErr: " + gwErr.toString());
                    // resolve(gwInfo);
                    reject(gwErr);
                } else {
                    gwInfo.ip = gwIp;
                    arp.getMAC(gwIp, (macErr, mac) => {
                        if (macErr) {
                            // only able to get the ip. That's ok,
                            // just get what's possible.
                            // reject(macErr);
                            resolve(gwInfo);
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

// clientGateway is a convenience function for obtaining the
// internet gateway by calling the 'nats' function and grabbing
// the 'innermost' nat node. If the network has only one NAT then
// the client gateway will also have the 'Gateway' role indicating
// that it is also the gateway to the internet.
function clientGateway() {
    return new Promise(
        (resolve, reject) => {
            nats().then(
                allNats => {
                    if (allNats.length > 0) {
                        resolve(allNats[0]); // always get the first
                    }
                }
            ).catch(
                nErr => {
                    reject(nErr);
                }
            );
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

        // internet gateway info
        // if the internal network has
        // more than one NAT then this gateway
        // is the 'outermost' gateway or the gateway
        // that leads to the internet.
        //
        // If there is more than one NAT then, at
        // the moment this library is unable to obtain
        // the mac address of the internet gateway.
        gatewayIp: "",
        gatewayMac: "", // provided if obtainable.

        startAt: new Date(),
        doneAt: new Date(), // the done date is updated when complete

        // array of node objects.
        // nodeObj = {
        //  host: "", // assigned local dns host name, if available
        //  ip: "",
        //  mac: "",
        //  interface: "", // wireless, ethernet
        //  roles: [], // list of devices roles (NAT, Router, Gateway)
        // }
        // localNodes:[], // list of local devices/network nodes. array of node objects.
    };

    let getGeoInfo = new Promise(
        (resolve, reject) => {
            // get public ip first
            publicIp.v4().then(pubIp => {
                netInfo.publicIp = pubIp;

                // geo info
                iplocation(pubIp).then(
                    geo => {
                        netInfo.city = geo.city;
                        netInfo.state = geo.region_code;
                        netInfo.country = geo.country;
                        netInfo.zip = geo.postal;
                        netInfo.isp = geo.org;

                        resolve(netInfo);
                    }
                ).catch(
                    err => {
                        // still resolve with the info
                        // we have - public ip
                        resolve(netInfo);
                    }
                )
            }).catch(err => {
                reject(err);
            });
        }
    );

    return new Promise(
        (resolve, reject) => {
            Promise.all([getGeoInfo, internetGateway()]).then(
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

// traceroute provides traceroute functionality similar
// to 'traceroute' cli. While it will lookup all host names
// associated with the ip it will not find all the ips. In
// this way the returned ips represent the actual ips reported back
// by each server along the way.
function traceroute(host = "", hostIp = "") {
    let trInfo = {
        targetHost: host,
        targetIp: hostIp,
        packetSize: 64,
        hops: [],
    };

    // initialize ping session
    let sessionOptions = {
        // networkProtocol: ping.NetworkProtocol.IPv4,
        packetSize: trInfo.packetSize, // default: 16
        retries: 1,
        // sessionId: (process.pid % 65535),
        // timeout: 2000,
        // ttl: 128 // different than the maxHops ttl value.
    };

    let maxHops = 64; // should be plenty
    let session = ping.createSession(sessionOptions);

    return new Promise(
        (resolve, reject) => {
            session.traceRoute(hostIp, maxHops,
                (error, target, ttl, sent, rcvd) => { // feed callback
                    // note: when error is not a TimeExeededError
                    // then its string value is the hop ip.
                    let hopIp = target; // target is just the default. if error exists then
                    let errMsg = "";
                    if (error) {
                        hopIp = error.source;

                        if (!(error instanceof ping.TimeExceededError)) {
                            errMsg = error.message;

                            // in case the error.message is empty.
                            if (errMsg === "") {
                                errMsg = error.toString();
                            }
                        }
                    }

                    let isPublic = false; // user should check that the hopIp is not empty as well.
                    let ms = rcvd - sent;

                    // make sure the 'error' is a valid ip.
                    if (ip.isV4Format(hopIp) === false) {
                        hopIp = "" // error value not an ip
                    } else {
                        isPublic = ip.isPublic(hopIp);
                    }

                    let hop = {
                        hostNames: [], // TODO: reverse dns lookup of ip to get host
                        ip: hopIp,
                        isPublic: isPublic, // if the ip is public or private
                        ttl: ttl,
                        ms: ms, // ms roundtrip latency
                        errMsg: errMsg,
                    };

                    trInfo.hops.push(hop); // add hop
                },
                (error, target) => { // done callback
                    if (error) {
                        reject(error);
                    } else {
                        // reverse dns lookup for all public ip hops
                        // in practice looking up all hops but ignoring
                        // errors.
                        let promises = []; // array of promises for reverse dns lookups.
                        for (let i = 0; i < trInfo.hops.length; i++) {
                            promises.push(reverseDns(trInfo.hops[i].ip));
                        }

                        Promise.all(promises).then(
                            allHostNames => {
                                // map all resolved hostNames back to each hop.
                                // no resolved hostNames means the value is 'undefined'.
                                for (let i = 0; i < trInfo.hops.length; i++) {
                                    if (!(typeof allHostNames[i] === 'undefined')) {
                                        trInfo.hops[i].hostNames = allHostNames[i];
                                    }
                                }
                                resolve(trInfo);
                            }
                        ).catch(
                            reverseDnsErr => {
                                reject(reverseDnsErr);
                            }
                        );
                    }
                });
        }
    );
}

// reverseDns will return all the host names associated with a provided
// ip address. If no ipAddress is provided then the promise is still not rejected
// but rather resolved with no hostNames - empty array ([]). This way it's easier
// and more friendly to perform a lot of lookups at one time without borking
// the chain of promises.
function reverseDns(ipAddress = "") { // returns promise
    return new Promise(
        (resolve) => {
            if (ipAddress.length === 0) {
                resolve([]);
            } else {
                dns.reverse(ipAddress, (revErr, hostNames) => {
                    // ignore error so that if the promise is called with Promise.all
                    // the rest will get a try.
                    // if no hostNames are found then hostNames is 'undefined' so
                    // normalize such as hostNames is always an array even if it's empty.
                    if (typeof hostNames === 'undefined') {
                        hostNames = [];
                    }
                    resolve(hostNames);
                });
            }
        }
    );
}

// tracerouteDns provides a simple dns lookup before passing on the
// host and ip to traceroute.
function tracerouteDns(host = "") {
    // dns lookup wrapper
    return new Promise(
        (resolve, reject) => {
            dns.lookup(host, (dnsError, hostIp, family) => {
                if (dnsError) {
                    reject(dnsError);
                } else {
                    traceroute(host, hostIp).then(
                        trInfo => {
                            resolve(trInfo);
                        }
                    ).catch(
                        trError => {
                            reject(trError);
                        }
                    );
                }
            });
        }
    );
}

// nats will attempt to find and return all the local network nates for the client
// default gateway. If more than one nat is returned then that exit path is double nated.
// The returned nat(s) are the same node objects as is provided from 'localNodes'.
//
// The nats are found by performing a traceroute and reporting the first x private
// node hops. If the network is stacked with more than one nat then it is unlikely
// that anything but the 'inner' nat mac address will be discoverable.
function nats() {
    return new Promise(
        (resolve, reject) => {
            tracerouteDns("www.google.com").then(
                trInfo => {
                    let nNodes = []; // nat nodes

                    // iterate through the path until a public ip is found.
                    // the private ips up until the first public ip are
                    // nats.
                    for (let i = 0; i < trInfo.hops.length; i++) {
                        if (trInfo.hops[i].isPublic) {
                            break;
                        } else {
                            // just get the first hostname - if any are reported
                            let hostName = "";
                            if (trInfo.hops[i].hostNames.length > 0) {
                                hostName = trInfo.hops[i].hostNames[0];
                            }

                            nNodes.push({
                                hostName: hostName,
                                ip: trInfo.hops[i].ip,
                                mac: "", // will lookup for only the 'inner' or first nat.

                                // the inner nat will have the role of 'NAT' and 'Router'. The outermost
                                // nat will have the 'NAT', 'Router' and 'Gateway' roles. The 'gateway'
                                // in this case is being defined as the 'Gateway to the internet'.
                                // in the weird case that there is one or more NATs in-between
                                // the inner and internet gateway, the 'Router' and 'NAT' roles are assigned.
                                //
                                // all nats have the 'NAT' and 'Router' roles.
                                roles: ["NAT", "Router"], // string array of roles. (dns, router, gateway, unknown)
                            });
                        }
                    }

                    // misc modifications
                    if (nNodes.length > 0) {
                        // update the outermost node by adding the
                        // 'Gateway' role.
                        nNodes[nNodes.length - 1].roles.push("Gateway");

                        // attempt to find and record the MAC address of the innermost
                        // NAT. Don't even try to find the MAC addresses of the other NATs
                        // b/c there is not going to be access and even if somehow there were
                        // access there could still be address collisions. Maybe there is another
                        // trick to at least obtain the mac address of the internet gateway but
                        // I don't know it.
                        arp.getMAC(nNodes[0].ip, (macErr, mac) => {
                            // just get what's possible. macErr is not
                            // taken into consideration. If the mac is provided
                            // then it is assigned.
                            if (typeof mac === 'string') {
                                nNodes[0].mac = mac;
                            }
                            resolve(nNodes);
                        });
                    }
                }
            ).catch(
                trErr => {
                    reject(trErr);
                }
            )
        }
    );
}

// internetGateway is a convenience function for obtaining the
// internet gateway by calling the 'nats' function and grabbing
// the 'outermost' nat node. The outermost nat node should also
// be tagged with the 'Gateway' role. 'Gateway' in this context
// indicates it is an internet gateway and not just a gateway to
// another private network.
function internetGateway() {
    return new Promise(
        (resolve, reject) => {
            nats().then(
                allNats => {
                    if (allNats.length > 0) {
                        resolve(allNats[allNats.length - 1]);
                    }
                }
            ).catch(
                nErr => {
                    reject(nErr);
                }
            );
        }
    );
}

// localNodes provides a full list of nodes on the local network
// as well as trying to determine information about some of them
// such as if the node is a gateway.
//
// Note that if the local network is double nated then the 'outer' local
// network nodes are not returned, only the 'inner' nodes.
function localNodes() {
    return localdevices();
    // let lNodes = {
    //
    // };
    //
    // let lNode = {
    //     hostName: "",
    //     ip: "",
    //     mac: "",
    //     roles: [], // string array of roles. (dns, router, gateway, unknown)
    // };

    // return new Promise(
    //     (resolve, reject) => {
    //         localdevices().then(
    //             nodes => {
    //                 resolve(nodes);
    //             }
    //         ).catch(
    //             err => {
    //                 reject(err);
    //             }
    //         );
    //     }
    // );
}

// speedTest performs an upload speed test to a specified
// destination endpoint.
// look at: https://github.com/nesk/network.js
// let stOptions = {
//     progressCb: (progress) => {}, // progress callback
// };
// let progress = {
//     msg: "", // progress point message
//     at: 0, // touch point number (progress point number)
//     of: 0, // total number of touch points.
//     perComplete: 0.00, // approximate percent complete.
// };
function speedTest(stOptions) {
    return new Promise(
        (resolve, reject) => {
            let totalProgress = 8.0;
            let currentProgress = 0;

            // p indicates returns a progress
            // object with the current progress info.
            let p = (pMsg) => {
                let tp = ++currentProgress;

                // for now it's a float string so that
                // the precision stays forced at 2 decimal places.
                let perComplete = ((tp/totalProgress) * 100).toFixed(2);
                return {
                    msg: pMsg,
                    at: tp,
                    of: totalProgress,
                    perComplete: perComplete,
                }
            };

            speedtestNet().on('data', stResult => {
                resolve(stResult);
            }).on('error', stErr => {
                reject(stErr);
            }).on('config', ()=> {
                stOptions.progressCb(p("obtained server config"));
            }).on('servers', servers => {
                stOptions.progressCb(p("accessing list of speed test servers"));
            }).on('bestservers', bestservers => {
                stOptions.progressCb(p("found best speed test server"));
            }).on('testserver', testserver => {
                stOptions.progressCb(p("checking server"));
            }).on('downloadspeed', speed => {
                stOptions.progressCb(p("download speed: " + parseFloat(speed).toFixed(2)));
            }).on('uploadspeed', speed => {
                stOptions.progressCb(p("upload speed: " + parseFloat(speed).toFixed(2)));
            }).on('done', dataOverload => {
                stOptions.progressCb(p("speed test complete"));
            });
        }
    );
}

module.exports.ping = pingPromise;
module.exports.pings = pingsPromise;
module.exports.clientInfo = clientInfo;
module.exports.clientGateway = clientGateway; // client gateway
module.exports.defaultGateway = defaultGateway; // default gateway
module.exports.internetGateway = internetGateway; // internet gateway
module.exports.gateways = nats; // all gateways on the way out to the internet.
module.exports.networkInfo = networkInfo;
module.exports.localNodes = localNodes;
module.exports.speedTest = speedTest;
module.exports.traceroute = tracerouteDns;
module.exports.reverseDns = reverseDns;
module.exports.httpCheck = httpCheck;
module.exports.httpChecks = httpChecks;

// TODO: add dns node support. Find the local network dns host.
// const netAddress = require('address');
// module.exports.dns = netAddress.dns;