"use strict";
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Designate the type of authentication used by an `AuthenticationProvider`.
 */
var AuthenticationType;
(function (AuthenticationType) {
    /**
     * X509 Certificate based authentication.
     */
    AuthenticationType[AuthenticationType["X509"] = 0] = "X509";
    /**
     * Token-based authentication uses shared access signature security tokens, generated and signed with a secret key.
     */
    AuthenticationType[AuthenticationType["Token"] = 1] = "Token";
})(AuthenticationType = exports.AuthenticationType || (exports.AuthenticationType = {}));
//# sourceMappingURL=authentication_provider.js.map