// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { AmqpError } from 'rhea';

export interface AmqpLink {
  attach: (callback: (err?: Error) => void) => void;
  detach: (callback: (err?: Error) => void, err?: Error | AmqpError) => void;
  forceDetach: () => void;
}
