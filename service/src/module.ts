// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Device } from './device';

export interface Module {
  /**
   * Module ID
   */
  moduleId: string;

  /**
   * Unique device identifier as it exists in the Azure IoT hub device registry.
   */
  deviceId: string;

  /**
   * Used to disambiguate devices that have been deleted/recreated with the same `moduleId`
   */
  generationId?: string;

  /**
   * Weak entity tag assigned to this module identity description
   */
  etag?: string;

  /**
   * Whether the module is 'connected' or 'disconnected'. It is not recommended to use this property to determine if the module is actually connected right now though,
   * since the module connection may have timed out and the IoT hub may not have detected it.
   */
  connectionState?: Device.ConnectionState;

  /**
   * Timestamp representing the last time `connectionState` changed.
   */
  connectionStateUpdatedTime?: string;

  /**
   * Timestamp representing the last time the module authenticated, sent a message, or received a message.
   */
  lastActivityTime?: string;

  /**
   * Number of c2d messages waiting to by delivered to the module.
   */
  cloudToDeviceMessageCount?: string;

  /**
   * Contains the symmetric keys used to authenticate this module.
   */
  authentication?: Device.Authentication;

  /**
   * Represents the modules managed by owner
   */
  managedBy?: string;
}
