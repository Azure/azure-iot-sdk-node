// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var pem = require('pem');
var fs = require('fs');
var certPath = __dirname + "\\cert\\";

var deviceID = process.argv[2].toLowerCase();
var cert = certPath + deviceID + '-cert.pem';
var key = certPath + deviceID + '-key.pem'

var certOptions = {
    commonName: deviceID,
    selfSigned: true,
    days: 10
};

// if certificate directory doesn't exists, create it
if (!fs.existsSync(certPath)) {
    console.log("Creating folder: " + certPath);
    fs.mkdirSync(certPath);
};

//creating certificates
pem.createCertificate(certOptions, function (err, result) {
    if (err) {
        console.log(err);
    } else {
        console.log("Creating certificate " + cert + " and key: " + key );
        fs.writeFileSync(cert, result.certificate);
        fs.writeFileSync(key, result.clientKey);
    }
});
