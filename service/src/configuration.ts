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
   * Type of content.  Will always be "assignment"
   */
  contentType?: string;

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
   * All the statistics that are emitted by the deployment.
   */
  statistics?: ConfigurationStatistics;

  /**
   * A string used for protecting opportunistic concurrency updates by the caller. This gets updated when deployment is update
   */
  etag?: string;
}

export interface ConfigurationStatistics {
  /**
   * [read-only] Count of devices in targetCondition
   */
  targetedCount?: number;

  /**
   * [read-only] Count of devices that have a desired module defined in this configuration.
   */
 appliedCount?: number;

  /**
   * [read-only] Count of devices that have a desired module defined in this configuration, for which the device reported a successful statusForLastDesired.
   */
 reportedSuccessfulCount?: number;

  /**
   * [read-only] Count of devices that have a desired module defined in this configuration, for which the device reported a failure statusForLastDesired.
   */
 reportedFailedCount?: number;

  /**
   * [read-only] Count of devices that have a reported module defined in this configuration with an unhealthy status (i.e. <> running).
   */
 unhealthyModulesCount?: number;

 /**
  * Other values
  */
 [key: string]: any;
}

export interface ConfigurationContent {
  /**
   * The configuration for all the modules.
   */
  moduleContent: {[key: string]: TwinContent};
}

export interface TwinContent {
  /**
   * Desired properties for this module
   */
  'properties.desired': any;
}
