// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import {  IncomingHttpHeaders } from 'http';

/**
 * Describes the response sent by the service when the device has accepted (or rejected) the cloud-to-device TCP streaming request
 */
export class StreamInitiationResult {
  /**
   * Token used in the Authorization header to authenticate the websocket connection
   */
  authorizationToken: string;

  /**
   * Boolean indicating whether the TCP streaming request has been accepted by the device
   */
  isAccepted: boolean;

  /**
   * URI of the websocket used to connect to the device
   */
  uri: string;

  /**
   * Creates a StreamInitiationResult from the response to the StreamInitiation request
   * @param headers headers received in the HTTP response to the stream initiation request
   * @param body    body of the response to the stream initiation request
   */
  static fromHttpResponse(headers: IncomingHttpHeaders, body: string): StreamInitiationResult {
    let result = new StreamInitiationResult();
    result.authorizationToken = headers['iothub-streaming-auth-token'] as string;
    result.isAccepted = headers['iothub-streaming-is-accepted'] === 'True';
    result.uri = headers['iothub-streaming-url'] as string;

    return result;
  }
}
