let net = require("../net.js");

let pingsOptions = {
    address: 'www.google.com',
    numPings: 3,
};

net.pings(pingsOptions, function(error, results) {
   if (error) {
       console.log("error: " + error.toString());
   } else {
       let l = results.pings.length;
       console.log("num of pings: " + l);
       for (let i = 0; i < l; i++) {
           console.log("success! start: '" + results.pings[i].start.toISOString() + "' return: '" + results.pings[i].return.toISOString() + "'");
       }
   }
});

net.ping('www.google.com', function(error, results) {
    if (error) {
        console.log("error: " + error.toString());
    } else {
        let l = results.pings.length;
        console.log("num of pings: " + l);
        for (let i = 0; i < l; i++) {
            console.log("success! start: '" + results.pings[i].start.toISOString() + "' return: '" + results.pings[i].return.toISOString() + "'");
        }
    }
});