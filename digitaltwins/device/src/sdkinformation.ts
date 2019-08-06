// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { BaseInterface } from './base_interface';
import { Property } from './interface_types';

/**
 * @private
 * A class to model the SDK Information interface.
 */
export class DigitalTwinInterface extends BaseInterface {
  language: Property;
  version: Property;
  vendor: Property;
  constructor(interfaceInstanceName: string, interfaceId: string) {
    super(interfaceInstanceName, interfaceId);
    this.language = new Property();
    this.version = new Property();
    this.vendor = new Property();
  }
}
