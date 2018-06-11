// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The Configuration object represents the configuration of a single device or it can represent a deployment which can be applied as a configuration to devices based on the targetCondition.
 */
export interface Configuration {
  /**
   * Id of this configuration.
   */
  id: string;

  /**
   * Version of the schema.
   */
  schemaVersion: string;

  /**
   * This is a dictionary<string, string> of labels.
   * Labels are a set of case-sensitive string key value pairs that you can use to describe a deployment.
   * Both keys and values are case-sensitive strings (up to 128 char long) of ASCII 7-bit alphanumeric chars + {'-', ':', '.', '+', '%', '_', '#', '*', '?', '!', '(', ')', ',', '=', '@', ';', '''}
   * (Note that $ is reserved)
   */
  labels?: {[key: string]: string};

  /**
   * Content of the configuration
   */
  content?: ConfigurationContent;

  /**
   * The target condition is continuously evaluated to include any new devices that meet the requirements or remove devices that no longer do through the life time of the deployment.
   * Use any Boolean condition on device twins tags or deviceId to select the target devices, e.g. tags.environment='prod' or deviceId='linuxprod' or tags.environment = 'prod' AND tags.location = 'westus'.
   */
  targetCondition?: string;

  /**
   * [read-only] Date time in ISO6801 of the creation of this configuration
   */
  createdTimeUtc?: string;

  /**
   * [read-only] Date time in ISO6801 of the last update of this configuration
   */
  lastUpdatedTimeUtc?: string;

  /**
   * When two deployments target the same device, the deployment with higher priority gets applied. If two deployments have the same priority, the deployment with the later creation date gets applied.
   */
  priority?: number;

  /**
   * System configuration metrics
   */
  systemMetrics?: ConfigurationMetrics;

  /**
   * Custom configuration metrics
   */
  metrics?: ConfigurationMetrics;

  /**
   * A string used for protecting opportunistic concurrency updates by the caller. This gets updated when deployment is update
   */
  etag?: string;
}

/**
 * Metrics used to report the results of applying a configuration.
 *
 * The `results` and `queries` dictionaries should have the same keys, each key matching a particular query in the `queries` dictionary with the associated results in the `results` dictionary
 */
export interface ConfigurationMetrics {
  /**
   * Dictionary containing, for each metric, the number of devices or modules on which the configuration was applied
   */
  results: { [key: string]: number };
  /**
   * Dictionary containing the queries used to compute each result in the `results` property.
   */
  queries: { [key: string]: string };
}

/**
 * Content of the configuration that needs to be applied to devices and/or modules on a device.
 */
export interface ConfigurationContent {
  /**
   * Configuration used by devices
   */
  deviceContent?: TwinContent;
  /**
   * Configuration used by modules on Edge devices
   */
  modulesContent?: {
    /**
     * The key shall be the module name, and the value the `TwinContent` for this module.
     */
    [key: string]: TwinContent
  };
}

/**
 *
 */
export interface TwinContent {
  /**
   * Desired properties for this module or device twin
   */
  'properties.desired': any;

  /**
   * Free-form properties where the key format is "properties.desired.<subpath>"
   */
  [key: string]: any;
}
