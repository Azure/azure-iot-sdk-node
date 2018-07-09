# azure-iot-common.SharedAccessSignature Requirements

## Overview
`SharedAccessSignature` is a generic type representing an ampersand-delimited string of 'name=value' pairs, and is used to securely encapsulate information about a resource on an IoT Hub.
It exposes a static factory method for creating a shared access signature object from a string, and exposes properties for each of the parsed fields in the string.
It also validates the required properties of the shared access signature.

## Example usage

'use strict';
var SharedAccessSignature = require('azure-iot-common'). SharedAccessSignature;

var sas1 = SharedAccessSignature.parse('a=b&c=d', ['a', 'c']);
console.log('a=' + sas1.a);
console.log('c=' + sas1.c);

var sas2 = SharedAccessSignature.create('uri', 'name', 'key', expiry);
console.log('sr=' + sas1.sr);
console.log('sig=' + sas1.sig);
console.log('skn=' + sas1.skn);
console.log('se=' + sas1.se);

## Public API

### constructor
Creates a new instance of the object.  Normally callers will use one of the static factory methods (create, parse) to create a `SharedAccessSignature`.

### create(resourceUri, keyName, key, expiry) [static]
The `create` static method returns a new instance of the SharedAccessSignature object with sr, sig, and se properties.  It may optionally have an skn property.

SRS_NODE_COMMON_SAS_05_008: [The create method shall accept four arguments:
resourceUri - the resource URI to encode into the token
keyName - an identifier associated with the key
key - a base64-encoded key value
expiry - an integer value representing the number of seconds since the epoch 00:00:00 UTC on 1 January 1970.]
SRS_NODE_COMMON_SAS_05_009: [If resourceUri, key, or expiry are falsy (i.e., undefined, null, or empty), create shall throw ReferenceException.]  Note that keyName may be falsy.
SRS_NODE_COMMON_SAS_05_010: [The create method shall create a new instance of SharedAccessSignature with properties: sr, sig, se, and optionally skn.]
SRS_NODE_COMMON_SAS_05_011: [The sr property shall have the value of resourceUri.]
SRS_NODE_COMMON_SAS_05_012: [The sig property shall be the result of URL-encoding the value <signature>.]
SRS_NODE_COMMON_SAS_05_013: [<signature> shall be an HMAC-SHA256 hash of the value <stringToSign>, which is then base64-encoded.]
SRS_NODE_COMMON_SAS_05_014: [<stringToSign> shall be a concatenation of resourceUri + '\n' + expiry.]
SRS_NODE_COMMON_SAS_05_015: [The se property shall have the value of expiry.]
SRS_NODE_COMMON_SAS_05_016: [The skn property shall be the value <urlEncodedKeyName>.]
SRS_NODE_COMMON_SAS_05_017: [<urlEncodedKeyName> shall be the URL-encoded value of keyName.]
SRS_NODE_COMMON_SAS_05_018: [If the keyName argument to the create method was falsy, skn shall not be defined.]

### parse(source, [requiredFields]) [static]
The `parse` static method returns a new instance of the SharedAccessSignature object with properties corresponding to each 'name=value' field found in source.

SRS_NODE_COMMON_SAS_05_001: [The input argument source shall be converted to string if necessary.]
SRS_NODE_COMMON_SAS_05_002: [The parse method shall create a new instance of SharedAccessSignature.]
SRS_NODE_COMMON_SAS_05_003: [It shall accept a string argument of the form 'name=value[&name=value…]' and for each name extracted it shall create a new property on the SharedAccessSignature object instance.]
SRS_NODE_COMMON_SAS_05_004: [The value of the property shall be the value extracted from the source argument for the corresponding name.]
SRS_NODE_COMMON_SAS_05_005: [The parse method shall throw FormatError if the shared access signature string does not start with 'SharedAccessSignature<space>'.]
SRS_NODE_COMMON_SAS_05_006: [The parse method shall throw ArgumentError if any of fields in the requiredFields argument are not found in the source argument.]
SRS_NODE_COMMON_SAS_05_007: [The generated SharedAccessSignature object shall be returned to the caller.]

### toString()
Creates a string representation of the SharedAccessSignature.

SRS_NODE_COMMON_SAS_05_019: [The toString method shall return a shared-access signature token of the form: SharedAccessSignature sr=<resourceUri>&sig=<urlEncodedSignature>&se=<expiry>&skn=<urlEncodedKeyName>]
SRS_NODE_COMMON_SAS_05_020: [The skn segment is not part of the returned string if the skn property is not defined.]

### createWithSigningFunction(credentials: authorization.TransportConfig, expiry: number, signingFunction: Function, callback: (err: Error, sas?: SharedAccessSignature) => void) [static]
Creates a `SharedAccessSignature` utilizing the supplied `signingFunction`.  If the signing operation is successful the results will be made available via the `callback`

**SRS_NODE_COMMON_SAS_06_001: [** If `credentials`, `expiry`, `signingFunction`, or `callback` are falsy, `createWithSigningFunction` shall throw `ReferenceError`. **]**
**SRS_NODE_COMMON_SAS_06_002: [** The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an `sr` property formed by url encoding `credentials.host` + `/devices/` + `credentials.deviceId` + `/modules/` + `credentials.moduleId`. **]**
**SRS_NODE_COMMON_SAS_06_003: [** The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an `se` property containing the value of the parameter `expiry`. **]**
**SRS_NODE_COMMON_SAS_06_004: [** The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an optional property `skn`, if the `credentials.sharedAccessKeyName` is not falsy,  The value of the `skn` property will be the url encoded value of `credentials.sharedAccessKeyName`. **]**
**SRS_NODE_COMMON_SAS_06_005: [** The `createWithSigningFunction` shall create a `SharedAccessSignature` object with a `sig` property with the SHA256 hash of the string sr + `\n` + se.  The `sig` value will first be base64 encoded THEN url encoded. **]**
**SRS_NODE_COMMON_SAS_06_006: [** The `createWithSigningFunction` will invoke the `callback` function with an error value if an error occurred during the signing. **]**
**SRS_NODE_COMMON_SAS_06_007: [** The `createWithSigningFunction` will invoke the `callback` with `sas` parameter containing the SharedAccessSignature object in the case of success. **]**

