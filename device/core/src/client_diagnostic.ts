// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Message, errors } from 'azure-iot-common';

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
    /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_001: [The constructor shall save the message body.] */
    this.id = id;
    this.correlationContext = {
      creationTimeUtc
    };
  }

  /**
   * @method            module:azure-iot-device.Diagnostics.getEncodedCorrelationContext
   * @description       get the diagnostic correlation context..
   *
   * @returns {string}
   */
  /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_005: [The function shall return concat string of all correlation contexts.] */
  public getEncodedCorrelationContext(): string {
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

  private diagSamplingPercentage: number;
  private currentMessageNumber: number;

  /**
   * @constructor
   */
  constructor() {
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_001: [This constructor shall set sampling percentage to 0.]
    this.diagSamplingPercentage = 0;
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_002: [This constructor shall set message number to 0.]
    this.currentMessageNumber = 0;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.getDiagSamplingPercentage
   * @description       get the diagnostic sampling percentage.
   *
   * @returns {number}
   */
  getDiagSamplingPercentage(): number {
    return this.diagSamplingPercentage;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.setDiagSamplingPercentage
   * @description       set the diagnostic sampling percentage.
   *
   * @param {number}   diagSamplingPercentage   The value of sampling percentage.
   * @throws {ArgumentError}     If value < 0 or value > 100.
   */
  setDiagSamplingPercentage(diagSamplingPercentage: number): void {
    if (diagSamplingPercentage % 1 !== 0) {
      throw new errors.ArgumentError('Sampling percentage should be integer');
    }
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_003: [When percentage is less than 0 or larger than 100, throw IllegalArgumentException.]
    if (diagSamplingPercentage < 0 || diagSamplingPercentage > 100) {
      throw new errors.ArgumentError('Sampling percentage should be [0,100]');
    }
    this.diagSamplingPercentage = diagSamplingPercentage;
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_004: [This function shall reset message number to 0.]
    this.currentMessageNumber = 0;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticClient.addDiagnosticInfoIfNecessary
   * @description       add the diagnostic info
   *
   * @param {Message}   message   The message
   */
  addDiagnosticInfoIfNecessary(message: Message): void {
    if (this.shouldAddDiagnosticInfo()) {
      let diagnostics: Diagnostics = new Diagnostics(this.generateEightRandomCharacters(), this.getCurrentTimeUtc());
      message.diagnostics = diagnostics;
    }
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
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_005: [This function shall generate 8 random chars, each is from 0-9a-z.]
    let result: string = '';
    for (let i = 0; i < 8; i++) {
      let randomNum: number = Math.floor(Math.random() * DiagnosticClient.DIAGNOSTIC_ID_CHARACTER_BASE);
      result += this.getDiagnosticIdChar(randomNum);
    }
    return result.toString();
  }

  private getCurrentTimeUtc(): string {
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_006: [This function shall return the current timestamp in 0000000000.000 pattern.]
    let currentDate = +new Date();
    return (currentDate / 1000.0).toFixed(3);
  }

  private shouldAddDiagnosticInfo(): Boolean {
    let result: Boolean = false;
    // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_007: [This function shall return false if sampling percentage is set to 0.]
    if (this.diagSamplingPercentage > 0 && this.diagSamplingPercentage <= 100) {
      if (this.currentMessageNumber === 100) {
        this.currentMessageNumber = 0;
      }
      this.currentMessageNumber++;
      // Codes_SRS_DEVICECLIENTDIAGNOSTIC_01_008: [This function shall return value due to the sampling percentage setting.]
      result = (Math.floor((this.currentMessageNumber - 2) * this.diagSamplingPercentage / 100.0) < Math.floor((this.currentMessageNumber - 1) * this.diagSamplingPercentage / 100.0));
    }
    return result;
  }
}
