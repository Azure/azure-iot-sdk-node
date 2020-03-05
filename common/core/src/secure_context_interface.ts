// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export interface SecureContext {
    /**
     * X509 Certificate.
     */
    cert?: string | string[] | Buffer | Buffer[];

    /**
     * Key associated with the X509 certificate.
     */
    key?: string | Buffer;

    /**
     * Passphrase used to decode the key associated with the X509 certificate.
     */
    passphrase?: string;

    /**
     * Name of an OpenSSL engine which can provide the client certificate.
     */
    clientCertEngine?: string;

    /**
     * Public certificate in PEM form for certificate authority being used by the Hub service.  This is the CA that the hub is using
     * to secure TLS connections and the client validates the connection using this public cert in order to validate the identity of
     * the hub.  If you are connecting to an Azure IoT Hub inside of an Azure data center, you do not need to set this.  If you are
     * connecting to some other hub (e.g. an Edge Hub), then you may need to set this to the server cert that the hub uses for TLS.
     */
    ca?: string;

    /**
     * Optionally affect the OpenSSL protocol behavior, which is not usually necessary. This should be used carefully if at all!
     * Value is a numeric bitmask of the SSL_OP_* options from OpenSSL Options.
     */
    secureOptions: number;
  }
