// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Message, errors } from 'azure-iot-common';

/**
 * Data structure to store diagnostic property data
 */
export class DiagnosticPropertyData {
  // Key of creation time in diagnostic context.
  static DIAGNOSTIC_CONTEXT_CREATION_TIME_UTC_PROPERTY: string = 'creationtimeutc';
  // Equal symbol in diagnostic context.
  static DIAGNOSTIC_CONTEXT_SYMBOL_EQUAL: string = '=';
  // And symbol in diagnostic context.
  static DIAGNOSTIC_CONTEXT_SYMBOL_AND: string = '&';

  private diagnosticId: string;
  private diagnosticCreationTimeUtc: string;

  /**
   * @constructor
   */
  constructor(diagnosticId: string, diagnosticCreationTimeUtc: string) {
    /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_001: [If the diagnosticId or diagnosticCreationTimeUtc is null, the constructor shall throw an IllegalArgumentException.] */
    if (!diagnosticId || !diagnosticCreationTimeUtc) {
      throw new errors.ArgumentError('The diagnosticId or diagnosticCreationTimeUtc cannot be null or empty.');
    }

    /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_002: [The constructor shall save the message body.] */
    this.diagnosticId = diagnosticId;
    this.diagnosticCreationTimeUtc = diagnosticCreationTimeUtc;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticPropertyData.getDiagnosticId
   * @description       get the diagnostic id.
   *
   * @returns {string}
   */
  getDiagnosticId(): string {
    return this.diagnosticId;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticPropertyData.setDiagnosticId
   * @description       set the diagnostic id.
   * @param {string}    diagnosticId   The value of diagnostic id.
   * @throws {ArgumentError}    If value is invalid
   */
  setDiagnosticId(diagnosticId: string): void {
    /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_003: [A valid diagnosticId shall not be null or empty.] */
    if (!diagnosticId) {
      throw new errors.ArgumentError('The diagnosticId cannot be null or empty.');
    }
    this.diagnosticId = diagnosticId;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticPropertyData.getDiagnosticCreationTimeUtc
   * @description       get the diagnostic creation timestamp.
   *
   * @returns {string}
   */
  getDiagnosticCreationTimeUtc(): string {
    return this.diagnosticCreationTimeUtc;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticPropertyData.setDiagnosticCreationTimeUtc
   * @description       set the diagnostic creation timestamp.
   * @param {string}    diagnosticId   The value of diagnostic creation timestamp.
   * @throws {ArgumentError}    If value is invalid
   */
  setDiagnosticCreationTimeUtc(diagnosticCreationTimeUtc: string): void {
    /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_004: [A valid diagnosticCreationTimeUtc shall not be null or empty.] */
    if (!diagnosticCreationTimeUtc) {
      throw new errors.ArgumentError('The diagnosticCreationTimeUtc cannot be null or empty.');
    }
    this.diagnosticCreationTimeUtc = diagnosticCreationTimeUtc;
  }

  /**
   * @method            module:azure-iot-device.DiagnosticPropertyData.getCorrelationContext
   * @description       get the diagnostic correlation context..
   *
   * @returns {string}
   */
  /* Codes_SRS_DIAGNOSTICPROPERTYDATA_01_005: [The function shall return concat string of all correlation contexts.] */
  public getCorrelationContext(): string {
    return DiagnosticPropertyData.DIAGNOSTIC_CONTEXT_CREATION_TIME_UTC_PROPERTY + DiagnosticPropertyData.DIAGNOSTIC_CONTEXT_SYMBOL_EQUAL + this.diagnosticCreationTimeUtc;
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
    if (typeof diagSamplingPercentage !== 'number') {
      throw new errors.ArgumentError('Sampling percentage only accept number');
    }
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
      let diagnosticPropertyData: DiagnosticPropertyData = new DiagnosticPropertyData(this.generateEightRandomCharacters(), this.getCurrentTimeUtc());
      message.diagnosticPropertyData = diagnosticPropertyData;
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
