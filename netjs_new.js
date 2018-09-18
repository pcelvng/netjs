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

// TODO:
// - ping
// - pings
// - clientInfo (or just call it client()?)
// - localNetwork (full local network hosts)
// - defaultGateway (copy over?)
// - httpCheck
// - httpChecks
// - speedTest (normalize output and cut out speedTest.net specific fields)


// newHost is an initializer for a host.
function newHost() {
    // return Object.create(hostNode);
    // return host;

    // host represents a host/interface on a
    // network.
    //
    // possible utility methods:
    // vendorLookup() - perform a vendor lookup (makes an http call)
    // isPublic() - logic check to discover if ip is public
    // geoLookup() - populates geo object
    // dnsLookup() - populates dns object
    return {
        name: '', // host name
        ip: '',
        mac: '',
        vendor: '', // interface vendor registered with the mac address
        interface_type: '', // wireless, ethernet - empty means unknown
        is_public: false,

        // a host can have one or more of the following roles:
        // - "nat" (if the host is nated)
        // - "gateway" (in this context 'gateway' is the gateway to the internet)
        // - "public" (public host is the host with the first public ip. public side of the internet 'gateway'
        // - "router" (the host is a router)
        // - "firewall" (currently not supported)
        // - "dhcp" (currently not supported - indicates host is also a dhcp server)
        // - "dns" (currently not supported - indicates the host is also a dns server)
        // - "proxy" (currently not supported - indicates the host is providing proxy services)
        //
        // if roles is an empty array then roles have not been discovered or
        // no roles are known which probably indicates the host is just another
        // client on the network such as a connected phone or desktop or laptop.
        roles: [], // "nat", "gateway", "router", "dns", "public"

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
        geo: {},
    };
}

function newHostGeo() {
    return {
        city: "", // city
        state: "", // state/region code
        country: "", // country code
        zip: "", // zip/postal code
        lat: 0.00, // registered lat
        lon: 0.00, // registered lon
        org: "" // org name of the local network public ip is the isp.
    };
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
                hst.geo = newHostGeo();
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
    let hst = newHost();

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
    let hst = newHost();
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

// nats will provide the local network nats on
// the outbound path to the internet. The nat
// with the role 'gateway' is the internet gateway.
function nats(cb) {
    let h = newHost();
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
                let n = newHost(); // nat host

                // the inner nat will have the role of 'NAT' and 'Router'. The outermost
                // nat will have the 'NAT', 'Router' and 'Gateway' roles. The 'gateway'
                // in this case is being defined as the 'Gateway to the internet'.
                // in the weird case that there is one or more NATs in-between
                // the inner and internet gateway, the 'Router' and 'NAT' roles are assigned.
                //
                // all nats have the 'NAT' and 'Router' roles.
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
            // timeout: 2000,
            // ttl: 128 // different than the maxHops ttl value.
        });

        session.on('error', (sErr) => {
            cb(sErr, hops);
        });

        session.traceRoute(destHst.ip, 64, // maxHops = 64 // plenty
            (error, target, ttl, sent, rcvd) => { // feed callback
                // note: when error is not a TimeExeededError
                // then its string value is the hop ip.
                let hopHst = newHost();
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

                let isPublic = false;
                let latency = rcvd - sent;

                // make sure the 'error' is a valid ip.
                if (ip.isV4Format(hopHst.ip)) {
                    hopHst.is_public = ip.isPublic(hopHst.ip);
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

module.exports.newHost = newHost;
module.exports.hostNameLookup = hostNameLookup;
module.exports.hostGeoLookup = hostGeoLookup;
module.exports.hostVendorLookup = hostVendorLookup;
module.exports.traceroute = traceroute;
module.exports.publicHost = publicHost;
module.exports.nats = nats;
module.exports.coreLocalNetwork = coreLocalNetwork;