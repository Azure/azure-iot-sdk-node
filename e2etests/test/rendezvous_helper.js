// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

function Rendezvous(done) {
  this.doneYet = {};
  this.done = done;
  this.everybodyDone = true;
}

Rendezvous.prototype.imIn = function(participant) {
  if (this.doneYet.hasOwnProperty(participant)) {
    throw new Error('can not participate more than once');
  }
  this.doneYet[participant] = false;
};

Rendezvous.prototype.imDone = function(participant) {
  if (Object.keys(this.doneYet).length === 0) {
    throw new Error('Nobody joined to rendezvous');
  }
  if (this.doneYet[participant]) {
    throw new Error('participant can not say done more than once');
  }
  this.doneYet[participant] = true;
  this.everybodyDone = true;
  Object.keys(this.doneYet).forEach(function(aParticipant) {
    this.everybodyDone = this.everybodyDone && this.doneYet[aParticipant];
  }.bind(this));
  if (this.everybodyDone) {
    return this.done();
  }
};

module.exports = {Rendezvous: Rendezvous};