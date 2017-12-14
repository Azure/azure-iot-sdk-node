// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Message, errors } from 'azure-iot-common';
import { Twin } from './twin';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:Diagnostics');

/**
 * Data structure to store diagnostic property data
 */
export class Diagnostics {
  // Key of properties in diagnostic context.
  static DIAGNOSTIC_CONTEXT_PROPERTY: any = {
    creationTimeUtc: 'creationtimeutc'
  };
  // Equal symbol in diagnostic context.
  static DIAGNOSTIC_CONTEXT_SYMBOL_EQUAL: string = '=';
  // And symbol in diagnostic context.
  static DIAGNOSTIC_CONTEXT_SYMBOL_AND: string = '&';

  public id: string;
  public correlationContext: any;

  /**
   * @constructor
   */
  constructor(id: string, creationTimeUtc: string) {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICS_01_001: [The Diagnostics constructor shall accept a correlation id of message.] */
    this.id = id;
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICS_01_002: [The Diagnostics constructor shall accept a correlation context including creation time of message.] */
    this.correlationContext = {
      creationTimeUtc
    };
  }

  /**
   * @method            module:azure-iot-device.Diagnostics.getEncodedCorrelationContext
   * @description       get the encoded diagnostic correlation context.
   *
   * @returns {string}
   */
  public getEncodedCorrelationContext(): string {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICS_01_003: [The getEncodedCorrelationContext function returned the encoded string of correlation context.] */
    let encodedCorrelationContext = '';
    for (let key in this.correlationContext) {
      if (encodedCorrelationContext !== '') {
        encodedCorrelationContext += Diagnostics.DIAGNOSTIC_CONTEXT_SYMBOL_AND;
      }
      encodedCorrelationContext += (Diagnostics.DIAGNOSTIC_CONTEXT_PROPERTY[key] + Diagnostics.DIAGNOSTIC_CONTEXT_SYMBOL_EQUAL + this.correlationContext[key]);
    }
    return encodedCorrelationContext;
  }
}

/**
 * Handling device client diagnostic information.
 */
export class DiagnosticClient {
  // The base of diagnostic id character. 0-9a-zA-Z is 62.
  static DIAGNOSTIC_ID_CHARACTER_BASE: number = 62;

  static DIAGNOSTIC_TWIN_KEY_ENABLED: string = 'diag_enable';
  static DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE: string = 'diag_sample_rate';
  static DIAGNOSTIC_TWIN_KEY_ERROR_MSG: string = 'diag_error';

  public diagEnabled: boolean;
  private diagSamplingPercentage: number;
  private currentMessageNumber: number;

  /**
   * @constructor
   */
  constructor() {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_001: [The Client constructor shall initial the percentage, message counter and diagnostic switch.] */
    this.diagSamplingPercentage = 0;
    this.currentMessageNumber = 0;
    this.diagEnabled = false;
    this.onDesiredTwinUpdate = this.onDesiredTwinUpdate.bind(this);
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.getDiagSamplingPercentage
   * @description       get the diagnostic sampling percentage.
   *
   * @returns {number}
   */
  getDiagSamplingPercentage(): number {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_002: [The getDiagSamplingPercentage function shall return the value of sampling percentage.] */
    return this.diagSamplingPercentage;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.setDiagSamplingPercentage
   * @description       set the diagnostic sampling percentage.
   *
   * @param {number}   diagSamplingPercentage   The value of sampling percentage.
   * @throws {ArgumentError}     If value < 0 or value > 100.
   * @throws {ArgumentError}     If value is not integer.
   */
  setDiagSamplingPercentage(diagSamplingPercentage: number): void {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_004: [The setDiagSamplingPercentage function shall throw an exception when input parameter is not an integer.] */
    if (diagSamplingPercentage % 1 !== 0) {
      throw new errors.ArgumentError('Sampling percentage should be integer');
    }
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_005: [The setDiagSamplingPercentage function shall throw an exception when input parameter is not in range [0,100].] */
    if (diagSamplingPercentage < 0 || diagSamplingPercentage > 100) {
      throw new errors.ArgumentError('Sampling percentage should be [0,100]');
    }
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_003: [The setDiagSamplingPercentage function shall set the value of sampling percentage.] */
    this.diagSamplingPercentage = diagSamplingPercentage;
    this.currentMessageNumber = 0;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.addDiagnosticInfoIfNecessary
   * @description       add the diagnostic info
   *
   * @param {Message}   message   The message to add diagnostic information
   */
  addDiagnosticInfoIfNecessary(message: Message): void {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_006: [The addDiagnosticInfoIfNecessary function shall attach diagnostic information to the message if necessary.] */
    if (this.shouldAddDiagnosticInfo()) {
      let diagnostics: Diagnostics = new Diagnostics(this.generateEightRandomCharacters(), this.getCurrentTimeUtc());
      message.diagnostics = diagnostics;
    }
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.onDesiredTwinUpdate
   * @description       callback when desired twin received.
   *
   * @param {Twin}   twin           The twin object
   * @param {any}    desiredTwin    The delta of desiredTwin
   */
  onDesiredTwinUpdate(twin: Twin, desiredTwin: any): void {
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_007: [The onDesiredTwinUpdate function shall be a callback when client receive a desired twin update.] */
    if (!desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED] && !desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE]) {
      return;
    }
    let errMsg = '';
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_008: [The onDesiredTwinUpdate function shall set the diagEnabled switch.] */
    if (typeof desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED] === 'boolean') {
      this.diagEnabled = desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED];
    } else if (typeof desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED] !== 'undefined'){
      errMsg += `Value of ${DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED} is invalid:${desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED]}(check if it is boolean) `;
    }
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_009: [The onDesiredTwinUpdate function shall set the sampling percentage.] */
    if (typeof desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE] === 'number') {
      try {
        this.setDiagSamplingPercentage(desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE]);
      } catch (e) {
        errMsg += `Value of ${DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE} is invalid:${e.message} `;
      }
    } else if (typeof desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE] !== 'undefined'){
      errMsg += `Value of ${DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE} is invalid:${desiredTwin[DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE]}(check if it is number) `;
    }
    /* Codes_SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_010: [The onDesiredTwinUpdate function shall send a reported twin to give feedback to diagnostic update.] */
    twin.properties.reported.update({
      [DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ENABLED]: this.diagEnabled,
      [DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE]: this.diagSamplingPercentage,
      [DiagnosticClient.DIAGNOSTIC_TWIN_KEY_ERROR_MSG]: errMsg
    }, (err) => {
      if (err) {
        debug('Update reported twin for diagnostic failed:' + err.message);
      }
    });
  }

  // Get a character from 0-9a-zA-Z
  private getDiagnosticIdChar(value: number): string {
    if (value <= 9) {
      // 48 is char code of '0'
      return String.fromCharCode(48 + value);
    } else if (value <= 9 + 26) {
      // 65 is char code of 'A'
      return String.fromCharCode(65 + value - 10);
    } else {
      // 97 is char code of 'a'
      return String.fromCharCode(97 + value - 36);
    }
  }

  private generateEightRandomCharacters(): string {
    // This function shall generate 8 random chars, each is from 0-9a-z.
    let result: string = '';
    for (let i = 0; i < 8; i++) {
      let randomNum: number = Math.floor(Math.random() * DiagnosticClient.DIAGNOSTIC_ID_CHARACTER_BASE);
      result += this.getDiagnosticIdChar(randomNum);
    }
    return result.toString();
  }

  private getCurrentTimeUtc(): string {
    // This function shall return the current timestamp in 0000000000.000 pattern.
    let currentDate = +new Date();
    return (currentDate / 1000.0).toFixed(3);
  }

  private shouldAddDiagnosticInfo(): boolean {
    let result: boolean = false;
    // This function shall return false if sampling percentage is set to 0.
    if (this.diagEnabled && this.diagSamplingPercentage > 0 && this.diagSamplingPercentage <= 100) {
      if (this.currentMessageNumber === 100) {
        this.currentMessageNumber = 0;
      }
      this.currentMessageNumber++;
      // This function shall return value due to the sampling percentage setting.
      result = (Math.floor((this.currentMessageNumber - 2) * this.diagSamplingPercentage / 100.0) < Math.floor((this.currentMessageNumber - 1) * this.diagSamplingPercentage / 100.0));
    }
    return result;
  }
}
