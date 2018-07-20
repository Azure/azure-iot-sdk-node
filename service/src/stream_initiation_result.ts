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
   * ???
   */
  data: any;                // is that the HTTP response body?

  /**
   * Boolean indicating whether the TCP streaming request has been accepted by the device
   */
  isAccepted: boolean;

  /**
   * IP Address of the device?
   */
  ipAddress: string;

  /**
   * ???
   */
  contentType?: string;      // should we copy this from the StreamInitiation request? not present in the HTTP response

  /**
   * ???
   */
  contentEncoding?: string;  // should we copy this from the StreamInitiation request? not present in the HTTP response

  /**
   * ???
   */
  streamName?: string;       // should we copy this from the StreamInitiation request? not present in the HTTP response.

  /**
   * URI of the websocket used to connect to the device
   */
  uri: string;

  /**
   * Gets a stream that is used to communicate directly with the device.
   * @param callback function that will be called with either an error if the stream can't be established or a stream that can be used to communicate with the device.
   */
  getStreamAsync(callback: (err: Error, stream?: any) => void): void {
    // TODO: I'm not sure I want to be in the business of taking websocket dependencies and returning stream objects. we might want to let customers
    // decide how to do this on their own terms.
    callback(new Error('Not Implemented'));
  }

  /**
   * Creates a StreamInitiationResult from the response to the StreamInitiation request
   * @param headers headers received in the HTTP response to the stream initiation request
   * @param body    body of the response to the stream initiation request
   */
  static fromHttpResponse(headers: IncomingHttpHeaders, body: string): StreamInitiationResult {
    let result = new StreamInitiationResult();
    result.authorizationToken = headers['iothub-streaming-auth-token'] as string;
    result.ipAddress = headers['iothub-streaming-ip-address'] as string;
    result.isAccepted = headers['iothub-streaming-is-accepted'] === 'True';
    result.uri = headers['iothub-streaming-url'] as string;
    result.data = body;
    result.contentType = headers['Content-Type'] as string;
    result.contentEncoding = headers['Content-Encoding'] as string;

    return result;
  }
}
