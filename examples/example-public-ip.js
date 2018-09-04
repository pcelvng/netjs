let net = require("../net.js");

// public ip
net.publicIp().then(ip => {
    console.log(ip);
});