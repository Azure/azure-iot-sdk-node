// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { BaseInterface } from './base_interface';
import { ReadOnlyProperty } from './interface_types';

/**
 * @private
 * A class to model the SDK Information interface.
 */
export class DigitalTwinInterface extends BaseInterface {
  language: ReadOnlyProperty;
  version: ReadOnlyProperty;
  vendor: ReadOnlyProperty;
  constructor(componentName: string, interfaceId: string) {
    super(componentName, interfaceId);
    this.language = new ReadOnlyProperty();
    this.version = new ReadOnlyProperty();
    this.vendor = new ReadOnlyProperty();
  }
}
