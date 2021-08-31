// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const tss = require('tss.js');
const tpm = require('azure-iot-security-tpm');
const myTpm = new tpm.TpmSecurityClient(undefined, new tss.Tpm(false));

myTpm.getEndorsementKey((err, endorsementKey) => {
  if (err) {
    console.log('The error returned from get ek is: ' + err);
  } else {
    console.log('The ek is: ' + endorsementKey.toString('base64'));
    myTpm.getStorageRootKey(( err, storageRootKey) => {
      if (err) {
        console.log('The error returned from get storage root key is: ' + err);
      } else {
        console.log('The srk is: ' + storageRootKey.toString('base64'));
        myTpm.getRegistrationId((err, registrationId) => {
          if (err) {
            console.log('The error returned from get registration id is: ' + err);
          } else {
            console.log('The registration id is: ' + registrationId);
          }
        });
      }
    });
  }
});
