// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { SharedAccessSignature } from './shared_access_signature';

/**
 * Interface that must be implemented by objects that are able to sign some
 * arbitrary data and yield a SharedAccessSignature.
 */
export interface SignatureProvider {
    sign(keyName: string, data: string, callback: (err: Error, signature: SharedAccessSignature) => void): void;
}
