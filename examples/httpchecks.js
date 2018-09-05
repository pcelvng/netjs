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