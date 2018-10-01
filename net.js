const dns = require("dns");
const os = require("os");

const ip = require('ip');
const iplocation = require('iplocation');
const localdevices =  require('local-devices');
const netping = require ("net-ping");
const network = require('network');
const arp = require('node-arp');
const publicIp = require('public-ip');
const speedtestNet = require('speedtest-net');
const request = require('request');

// Host constructor
function Host() {
    this.name = ''; // host name
    this.ip = '';
    this.mac = '';
    this.vendor = ''; // interface vendor registered with the mac address
    this.interface_type = ''; // wireless, ethernet - empty means unknown
    this.is_public = false;

    // a host can have one or more of the following roles:
    // - "nat" (if the host is nated)
    // - "gateway" (in this context 'gateway' is the gateway to the internet)
    // - "public" (public host is the host with the first public ip. public side of the internet 'gateway'
    // - "router" (the host is a router)
    // - "firewall" (currently not supported)
    // - "dhcp" (currently not supported - indicates host is also a dhcp server)
    // - "dns" (currently not supported - indicates the host is also a dns server)
    // - "proxy" (currently not supported - indicates the host is providing proxy services)
    // - "remote" (host that is not on the local network and does not belong to the local network)
    // - "device" (connected network device)
    // - "client" (client host - where diagnostic is being run)
    //
    // if roles is an empty array then roles have not been discovered or
    // no roles are known which probably indicates the host is just another
    // client on the network such as a connected phone or desktop or laptop.
    this.roles = []; // "nat", "gateway", "router", "dns", "public", "remote"

    // no dns entries returns an empty dns object
    //
    // if it's not empty then all the fields will be present
    // even if empty.
    // Note: currently not implemented.
    //dns: {},

    // geo only possibly available when the ip is public.
    // no geo entries returns an empty geo object.
    //
    // if it's not empty then all the fields will be present
    // even if those individual fields are empty.
    this.geo = {};
}

// HostGeo constructor
function HostGeo() {
    this.city = ""; // city
    this.state = ""; // state/region code
    this.country = ""; // country code
    this.zip = ""; // zip/postal code
    this.lat = 0.00; // registered lat
    this.lon = 0.00; // registered lon
    this.org = ""; // org name of the local network public ip is the isp.
}

// hostNameLookup will do a reverse dns lookup of the provided
// host object 'ip' property.
// If there is an error then the hostname is simply
// not populated.
// The callback function 'cb' receives a single parameter
// containing a host.
//
// Note that if host.name is already populated
// then the lookup will be skipped.
function hostNameLookup(hst, cb) { // returns promise
    if (hst.name.length > 0 && hst.ip.length === 0) {
        // in this case, only pick the first
        // host name when more than one is present
        // since it will just reside in the h.name field.
        dns.reverse(hst.ip, (rErr, hNames) => {
            // ignore error so that if the promise is called with Promise.all
            // the rest will get a try.
            // if no hNames are found then hNames is 'undefined' so
            // normalize such as hNames is always an array even if it's empty.
            if (Array.isArray(hNames) && hNames.length > 0) {
                hst.name = hNames[0];
            }
            cb(hst);
        });
    } else {
        cb(hst);
    }
}

// hostGeoLookup will do a geo
// lookup if:
// - host geo object is empty
// - ip is public
// - ip is valid
function hostGeoLookup(hst, cb) {
    if (Object.keys(hst.geo).length > 0) {
        cb(hst);
    } else if (!hst.is_public) {
        cb(hst); // geo lookup only available for public ips.
    } else {
        iplocation(hst.ip, (ipErr, geo) => {
            if (ipErr) {
                cb(hst);
            } else {
                hst.geo = new HostGeo();
                hst.geo.city = geo.city;
                hst.geo.state = geo.region_code;
                hst.geo.country = geo.country;
                hst.geo.zip = geo.postal;
                hst.geo.lat = geo.latitude;
                hst.geo.lon = geo.longitude;
                hst.geo.org = geo.org;
                cb(hst);
            }
        });
    }
}

// hostVendorLookup will make an http
// call to lookup the vendor associated
// with the mac address.
//
// The lookup is only performed if:
// - there is a mac address
// - the vendor does not already have a value
//
// Please note that, at the moment the api calls are not
// rate limited by the library which means that
// a maximum of 1 request/second can be made before
// getting rate limited by macvendors.com with a 429 response
// code.
// https://macvendors.com/api
function hostVendorLookup(hst, cb) {
    if (hst.mac.length > 0 && hst.vendor.length === 0) {
        request('https://api.macvendors.com/' + hst.mac, (rErr, res, body) => {
            if (rErr) {
                cb(hst);
            } else if (res) {
                if (res.statusCode === 200) {
                    hst.vendor = body;
                    cb(hst);
                } else {
                    cb(hst);
                }
            }
        });
    } else {
        cb(hst);
    }
}

// hostIpLookup will do a dns lookup
// to obtain the ip address for the provided
// host name.
//
// if the host.name value is empty then
// no lookup will be made.
function hostIpLookup(hst, cb) {
    if (hst.name.length > 0 && hst.ip.length === 0) {
        dns.lookup(hst.name, (lErr, hostIp, family) => {
            if (lErr) {
                cb(hst);
            } else {
                hst.ip = hostIp;
                hst.is_public = ip.isPublic(hst.ip);
                cb(hst);
            }
        });
    } else {
        cb(hst);
    }
}

// publicHost will provide the public internet host which is
// the first host out on the internet with a
// public ip. It is the 'public' side of the internet gateway host.
// geo info lookup is included.
//
// cb = (hst) => {}
// hst == public internet host which is a host object
function publicHost(cb) {
    let hst = new Host();

    // not currently marked with 'gateway' or 'nat' roles.
    // maybe consider changing the role designation and/or adding
    // roles.
    hst.roles = ['public'];

    // get public ip first
    publicIp.v4().then(pubip => {
        hst.ip = pubip;
        hst.is_public = true;

        // reverse dns lookup to discover a host name
        hostNameLookup(hst, (hst) => {
            hostGeoLookup(hst, (hst) => {
                cb(hst);
            })
        })

        // geo lookup
    }).catch(err => {
        cb(hst);
    });
}

// clientHost provides the client host information - current
// active network interface.
function clientHost(cb) {
    let hst = new Host();
    hst.roles = ["client"];

    network.get_active_interface((iErr, actInterface) => {
        if (iErr) {
            cb(hst);
        } else {
            hst.mac = actInterface.mac_address;
            hst.interface_type = actInterface.type.toLowerCase();
            hst.ip = actInterface.ip_address;
            hst.is_public = ip.isPublic(hst.ip); // surprised if this is public, but check anyway

            // add geo (unlikely but it doesn't hurt)
            hostGeoLookup(hst, (hst) => {
                // try vendor lookup
                // Note: if a lot of other things are going
                // on then could be rate limited.
                hostVendorLookup(hst, (hst) => {
                    // if there are local network dns
                    // the client could have a host name
                    // so give it a shot.
                    hostNameLookup(hst, (hst) => {
                        cb(hst); // done!
                    })
                })
            })
        }
    })
}

// client contains information about the client host
// as well as general information about the client machine.
function client(cb) {
    clientHost((hst) => {
        cb({
            host: hst,
            os_user: os.userInfo().username,
            os_hostname: os.hostname(),
            os_platform: os.platform(),
        });
    });
}

// nats will provide the local network nats on
// the outbound path to the internet. The nat
// with the role 'gateway' is the internet gateway.
function nats(cb) {
    let h = new Host();
    h.ip = '8.8.8.8'; // google dns

    traceroute(h, (trErr, hops) => {
        let nts = []; // nat nodes

        // iterate through the path until a public ip is found.
        // the private ips up until the first public ip are
        // nats.
        for (let i = 0; i < hops.length; i++) {
            if (hops[i].is_public) {
                break;
            } else {
                let n = new Host(); // nat host

                // the inner nat will have the role of 'nat' and 'router'. The outermost
                // nat will have the 'nat', 'router' and 'gateway' roles. The 'gateway'
                // in this case is being defined as the 'gateway to the internet'.
                // in the weird case that there is one or more NATs in-between
                // the inner and internet gateway, the 'router' and 'nat' roles are assigned.
                //
                // all nats have the 'nat' and 'router' roles.
                hops[i].roles = ["nat", "router"];

                // delete extra hop fields
                delete hops[i].latency;
                delete hops[i].ttl;
                delete hops[i].err_msg;
                nts.push(hops[i]);
            }
        }

        // misc modifications
        if (nts.length > 0) {
            // update the outermost node by adding the
            // 'gateway' role.
            nts[nts.length - 1].roles.push("gateway");

            // attempt to find and record the MAC address of the innermost
            // NAT. Don't even try to find the MAC addresses of the other NATs
            // b/c there is not going to be access and even if somehow there were
            // access there could still be address collisions. Maybe there is another
            // trick to at least obtain the mac address of the internet gateway but
            // I don't know it.
            arp.getMAC(nts[0].ip, (macErr, mac) => {
                // just get what's possible. macErr is not
                // taken into consideration. If the mac is provided
                // then it is assigned.
                if (typeof mac === 'string') {
                    nts[0].mac = mac;
                }

                // attempt to get the vendor name
                // it may not show up if too many other vendor calls are
                // being made at the same time. The rate limit is 1 per second.
                hostVendorLookup(nts[0], (hst) => {
                    // attempt a host name lookup in the case of
                    // a local network dns.
                    hostNameLookup(hst, (hst) => {
                        // reassignment not necessary
                        // since the same object is operated on.
                        cb(nts);
                    });
                });
            });
        } else {
            cb(nts);
        }
    });
}

// coreLocalNetwork obtains the core players
// in the client local network.
//
// An attempt is made to locate the following
// host types:
// - internet host (interface associated with the public ip)
// - internet gateway (nat on the private side of the internet gateway)
// - other nats (the network may have more than one nat besides the
//   internet gateway)
// - client host (the host info of the client)
//
// to be supported in the future:
// - other nats and routers that are not just
//   located on the out-bound internet path.
// - other routers
// - client dns hosts (dns hosts the client is currently using)
//
// cb = (hsts) => {}
// callback function simply returns an array of hosts.
function coreLocalNetwork(cb) {
    let hsts = [];

    // obtain public internet host - the public face of the local
    // network.
    publicHost((hst) => {
        hsts.push(hst);

        // client host
        clientHost((hst) => {
            hsts.push(hst);

            // nats/gateways
            nats((nts) => {
                hsts.push(...nts);
                cb(hsts);
            });
        })
    });
}

function localNetwork(cb) {
    coreLocalNetwork((hsts) => {
        let coreCnt = hsts.length;

        // add remaining misc nodes
        localdevices().then(
            devices => {
                // translate 'devices' format to 'host' format
                // and push to local host list.
                for (let i = 0; i < devices.length; i++) {
                    let h = new Host();
                    let d = devices[i];
                    if (d.name !== "?") {
                        h.name = d.name;
                    }
                    h.ip = d.ip;
                    h.mac = d.mac;
                    h.roles = ["device"];

                    // check that device host doesn't already exist
                    // on the core network.
                    // If it does exist check if the host name is available
                    // and add it.
                    let isCore = false;
                    for (let j = 0; j < coreCnt; j++) {
                        // check that the mac addresses are also the same
                        // to rule out and 'outer' nat that doesn't have
                        // a mac address but does have the same private ip
                        // as a host on the 'inner' network.
                        if (hsts[j].ip === h.ip && hsts[j].mac.length > 0) {
                            isCore = true;

                            if (hsts[j].name.length === 0 && h.name.length > 0) {
                                hsts[j].name = h.name;
                            }
                        }
                    }

                    // only add device hosts if not already included in the
                    // core local network.
                    if (!isCore) {
                        hsts.push(h);
                    }

                    // Note: not going to perform a vendor lookup since
                    // vendor lookup is rate limited to 1 per second.
                }

                cb(hsts);
            }
        ).catch(
            lErr => {
                cb(hsts);
            }
        );
    });
}

// traceroute provides low configuration traceroute functionality similar
// to 'traceroute' cli. While it will lookup all host names
// associated with the ip it will not find all the ips. In
// this way the returned ips represent the actual ips reported back
// by each server along the way.
//
// Note that traceroute is performed with 64 bit packet sizes.
// For now the max number of hops is not configurable.
//
// Traceroute hosts have two additional object fields:
// - latency (roundtrip latency from user client to that host)
// - ttl
// - err_msg (representing some kind of error on that hop)
//
// cb = (err, hops) => {}
function traceroute(destHst, cb) {
    let hops = []; // array of hosts with 'latency' and 'ttl' fields added.

    // lookup destHst.ip
    hostIpLookup(destHst, (destHst) => {
        // initialize netping session
        let session = netping.createSession({
            // networkProtocol: netping.NetworkProtocol.IPv4,
            packetSize: 64, // default: 16
            retries: 1,
            // sessionId: (process.pid % 65535),
            timeout: 4000,
            // ttl: 128 // different than the maxHops ttl value.
        });

        session.on('error', (sErr) => {
            cb(sErr, hops);
        });

        session.traceRoute(destHst.ip, 64, // maxHops = 64 // plenty
            (error, target, ttl, sent, rcvd) => { // feed callback
                // note: when error is not a TimeExeededError
                // then its string value is the hop ip.
                let hopHst = new Host();
                hopHst.ip = target;

                let errMsg = "";
                if (error) {
                    hopHst.ip = error.source; // most of the time it's a TimeExceededError

                    if (!(error instanceof netping.TimeExceededError)) {
                        errMsg = error.message;

                        // in case the error.message is empty.
                        if (errMsg === "") {
                            errMsg = error.toString();
                        }
                    }
                }

                let latency = rcvd - sent;

                // make sure the 'error' is a valid ip.
                if (ip.isV4Format(hopHst.ip)) {
                    hopHst.is_public = ip.isPublic(hopHst.ip);
                    if (hopHst.is_public) {
                        hopHst.roles = ['remote'];
                    } else {
                        hopHst.roles = ['nat', 'router']
                    }
                } else {
                    hopHst.ip = "" // error value not an ip
                }

                // extra special host fields
                hopHst.latency = latency;
                hopHst.ttl = ttl;
                hopHst.err_msg = errMsg;

                hops.push(hopHst); // add hop host
            },
            (trErr, target) => { // done callback
                if (trErr) {
                    cb(null, hops);
                } else {
                    // TODO: consider adding geo
                    // TODO: consider adding host name lookup
                    cb(null, hops);
                }
            });
    });
}

function PingsCfg() {
    this.target = ''; // ping target; can be ip or hostname
    this.num_pings = 1;
}

function PingResult(pingHost = '') {
    this.packet_size = 64; // for now not an option.
    this.ping_host = pingHost; // destination host
    this.sent = 1; // num of pings sent; default is 1
    this.returned = 0; // num of returned pings
    this.loss = 0; // ping loss; sent - returned
    this.min_latency = 0; // min ping latency
    this.max_latency = 0; // max ping latency
    this.avg_latency = 0; // avg ping latency
    this.jitter = 0; // jitter (std deviation) ping latency
    this.pings = []; // array of numeric values representing millisecond ping latency
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
//
// cb = (result) => {}
function pings(pingsCfg, cb) {
    // create host to represent ping destination
    let hst = new Host();
    hst.roles = ['remote'];

    // check if target is ip address or host name.
    if (ip.isV4Format(pingsCfg.target)) {
        hst.ip = pingsCfg.target;
    } else {
        hst.name = pingsCfg.target;
    }

    let result = new PingResult(hst);

    // numPings option
    if (typeof pingsCfg.num_pings === 'number') {
        // numPings must at least be 1 or greater.
        if (pingsCfg.num_pings > 0) {
            result.sent = pingsCfg.num_pings;
        }
    }

    // get the target host ip - if needed
    // not going to bother with reverse lookup.
    hostIpLookup(hst, (hst) => {
        hst.is_public = ip.isPublic();

        // dest host geo lookup
        hostGeoLookup(hst, (hst) => {
            // initialize ping session
            let session = netping.createSession({
                // networkProtocol: ping.NetworkProtocol.IPv4,
                packetSize: result.packetSize, // default: 16
                retries: 0, // if not 0 then there appears to be weird side effects
                // sessionId: (process.pid % 65535),
                // timeout: 2000,
                // ttl: 128
            });

            let cnt = 0;
            let pa = () => {
                session.pingHost(hst.ip, (error, target, sent, rcvd) => {
                    if (!error) {
                        let ms  = rcvd - sent;
                        if (typeof ms === 'number') {
                            result.pings.push(ms);
                        }
                    }

                    // recurse pings until complete
                    cnt++;
                    if (cnt < result.sent) { // sent is the total intended to send.
                        pa();
                    } else {
                        // stats
                        result.returned = result.pings.length;
                        result.loss = result.sent - result.returned;
                        result.min_latency = Math.min(...result.pings);
                        result.max_latency = Math.max(...result.pings);
                        result.avg_latency = (
                            () => {
                                let sum = 0.0;
                                for (let i = 0; i < result.pings.length; i++) {
                                    sum += result.pings[i];
                                }

                                return sum/result.pings.length;
                            }
                        )();

                        // jitter is just a sample standard deviation
                        // note: if there is just one ping then jitter is NaN.
                        result.jitter = (
                            () => {
                                let sumSq = 0.0; // diff around the mean squared and summed.
                                for (let i = 0; i < result.pings.length; i++) {
                                    sumSq += Math.pow(result.pings[i] - result.avg_latency, 2);
                                }

                                return Math.sqrt(sumSq /(result.pings.length-1)) // n = sample size - 1
                            }
                        )();

                        cb(result);
                    }
                })
            };

            pa();
        });
    });
}

// ping is simple wrapper around pings. It just
// does one ping.
function ping(target, cb) {
    let cfg = new PingsCfg();
    cfg.target = target;
    cfg.num_pings = 1;

    pings(cfg, cb);
}

// pingUrl checks a single
// http(s) endpoint and returns the endpoint
// checked along with the returned http response code.
//
// Notes:
// - only supports the GET action method at the moment.
// - does not follow redirects.
//
// should be a complete url such as
// "http://www.google.com/path?var1=value1"
// "https://www.google.com/path"
//
// cb = (err, resp) => {}
// resp = {url: 'url', response_code: 200}
function pingUrl(url, cb) {
    request(url, (rErr, res, body) => {
        let responseCode = 0;
        if (res && res.statusCode) {
            responseCode = res.statusCode;
        }
        cb(rErr, {url: url, response_code: responseCode});
    });
}

// pingUrls is like pingUrl for an array of destinations.
// destinations = array of http(s) destination strings.
// cb = (err, urls) => {}
function pingUrls(urls, cb) {
    let p = (url) => {
        return new Promise(
            (resolve, reject) => {
                pingUrl(url, (pErr, url) => {
                    if (pErr) {
                        reject(pErr);
                    } else {
                        resolve(url)
                    }
                });
            }
        );
    };

    let promises = []; // pingUrl promises
    for (let i = 0; i < urls.length; i++) {
        promises.push(p(urls[i]));
    }

    Promise.all(promises).then(
        urlObjs => {
            cb(null, urlObjs);
        }
    ).catch(
        pErr => {
            cb(pErr, []);
        }
    );
}

// speed performs an upload speed test to a specified
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
function speed(stOptions) {
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
                    percent_complete: perComplete,
                }
            };

            speedtestNet().on('data', stResult => {
                // convert to standard host object format
                let result = {
                    download_mbps: 0,
                    upload_mbps: 0,
                    download_size: 0, // in bytes
                    upload_size: 0, // in bytes
                    distance_mi: 0, // in miles
                    ping_ms: 0,
                    client_isp: '',
                    server_sponsor: '', // speed test server sponsor name
                    client: new Host(),
                    server: new Host(),
                };

                // extract and translate results
                result.download_mbps = stResult.speeds.download;
                result.upload_mbps = stResult.speeds.upload;
                result.download_size = stResult.speeds.originalDownload;
                result.upload_size = stResult.speeds.originalUpload;
                result.distance_mi = stResult.server.distanceMi;
                result.ping_ms = stResult.server.ping;
                result.client_isp = stResult.client.isp;
                result.server_sponsor = stResult.server.sponsor;
                // client
                result.client.ip = stResult.client.ip;
                result.client.is_public = ip.isPublic(result.client.ip); // can't imagine it wouldn't be public
                result.client.roles = ['public'];

                // server
                result.server.name = stResult.server.host;
                result.server.roles = ['remote'];

                // client host name lookup
                hostNameLookup(result.client, (cHst) => {
                    // client geo lookup
                    hostGeoLookup(result.client, (cHst) => {
                        if (result.client.geo.org !== '') {
                            result.client_isp = result.client.geo.org;
                        }

                        // server ip lookup
                        hostIpLookup(result.server, (sHst) => {
                            // server geo lookup
                            hostGeoLookup(result.server, (sHst) => {
                                resolve(result);
                            })
                        });
                    });
                });
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

module.exports.Host = Host;
module.exports.HostGeo = HostGeo;
module.exports.hostNameLookup = hostNameLookup;
module.exports.hostIpLookup = hostIpLookup;
module.exports.hostGeoLookup = hostGeoLookup;
module.exports.hostVendorLookup = hostVendorLookup;
module.exports.traceroute = traceroute;
module.exports.publicHost = publicHost;
module.exports.clientHost = clientHost;
module.exports.client = client;
module.exports.nats = nats;
module.exports.coreLocalNetwork = coreLocalNetwork;
module.exports.localNetwork = localNetwork;
module.exports.PingsCfg = PingsCfg;
module.exports.PingResult = PingResult;
module.exports.pings = pings;
module.exports.ping = ping;
module.exports.pingUrl = pingUrl;
module.exports.pingUrls = pingUrls;
module.exports.speed = speed;
