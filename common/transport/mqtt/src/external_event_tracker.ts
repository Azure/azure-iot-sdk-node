// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';

export class ExternalEventTracker {
  private _emitter: EventEmitter;
  private _listenerContainer: Map<string, ((...args: any[]) => void)[]> = new Map();
  constructor(emitter: EventEmitter) {
    this._emitter = emitter;
  }

  addTrackedListener(eventName: string, listener: (...args: any[]) => void): void {
    this._emitter.addListener(eventName, listener);
    if (this._listenerContainer.has(eventName)) {
      this._listenerContainer.get(eventName).push(listener);
    } else {
      this._listenerContainer.set(eventName, [listener]);
    }
  }

  removeTrackedListener(eventName: string, listener: (...args: any[]) => void): void {
    const listeners = this._listenerContainer.get(eventName);
    const index = listeners?.indexOf(listener);
    if (listeners === undefined || index === -1) return;

    if (listeners.length === 1) {
      this._listenerContainer.delete(eventName);
    } else {
      listeners.splice(index, 1);
    }

    this._emitter.removeListener(eventName, listener);
  }

  removeAllTrackedListeners(eventName?: string): void {
    const eventsToRemove = eventName ? [eventName] : this._listenerContainer.keys();
    for (const event of eventsToRemove) {
      for (const listener of (this._listenerContainer.get(event) ?? [])) {
        this._emitter.removeListener(event, listener);
      }
      this._listenerContainer.delete(event);
    }
  }
}
