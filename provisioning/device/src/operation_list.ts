// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

export class OperationList {
  private _pendingOperations: any[];

  constructor() {
    this._pendingOperations = [];
  }

  operationStarted(operation: any): void {
    this._pendingOperations.push(operation);
  }

  operationIsStillPending(operation: any): boolean {
    return (this._pendingOperations.indexOf(operation, 0) > -1);
  }

  operationEnded(operation: any): void {
    let index = this._pendingOperations.indexOf(operation, 0);
    if (index > -1) {
      this._pendingOperations.splice(index, 1);
    }
  }

  popAllPendingOperations(callback: (operation: any) => void): void {
    let operation;
    while ((operation = this._pendingOperations.pop()) != null) {
      callback(operation);
    }
  }

}

