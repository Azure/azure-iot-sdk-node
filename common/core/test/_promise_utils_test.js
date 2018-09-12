// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var callbackToPromise = require('../lib/promise_utils').callbackToPromise;
var errorCallbackToPromise = require('../lib/promise_utils').errorCallbackToPromise;
var noErrorCallbackToPromise = require('../lib/promise_utils').noErrorCallbackToPromise;
var doubleValueCallbackToPromise = require('../lib/promise_utils').doubleValueCallbackToPromise;

describe('PromiseUtils', () => {
    describe('#callbackToPromise', () => {
        it('returns undefined result for empty callback', function (done) {
            const functionWithEmptyPromise = (callback) => {
                callback();
            };

            callbackToPromise(functionWithEmptyPromise).then(result => {
                assert.isUndefined(result);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns undefined result for callback with undefined result', function (done) {
            const functionWithEmptyPromise = (callback) => {
                callback(undefined, undefined);
            };

            callbackToPromise(functionWithEmptyPromise).then(result => {
                assert.isUndefined(result);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns simple value properly when callback invoked', function (done) {
            const returnValue = 'sample value';
            const functionWithSimpleResult = (callback) => {
                callback(undefined, returnValue);
            };

            callbackToPromise(functionWithSimpleResult).then(result => {
                assert.equal(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns complex object properly when callback invoked', function (done) {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithSimpleResult = (callback) => {
                callback(undefined, returnValue);
            }

            callbackToPromise(functionWithSimpleResult).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('enables async await', async function () {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithSimpleResult = (callback) => {
                callback(undefined, returnValue);
            }

            try {
                const result = await callbackToPromise(functionWithSimpleResult);
                assert.deepEqual(result, returnValue);
            } catch (error) {
                assert.fail(error);
            }
        });

        it('returns complex object properly from long running operation', (done) => {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithSimpleResult = (callback) => {
                setTimeout(() => callback(undefined, returnValue), 1000);
            };

            callbackToPromise(functionWithSimpleResult).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('rejects when only error returned', function (done) {
            const error = {
                'message': 'sample message'
            };
            const functionWithEmptyPromise = (callback) => {
                callback(error);
            };

            callbackToPromise(functionWithEmptyPromise).then(result => {
                done(result);
            }, err => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('rejects when error and result returned', function (done) {
            const error = {
                'message': 'sample message'
            };
            const functionWithEmptyPromise = (callback) => {
                callback(error, 'this shouldn\'t be returned');
            };

            callbackToPromise(functionWithEmptyPromise).then(result => {
                done(result);
            }, err => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('returns empty result when action completed successfully and no result returned', function (done) {
            const functionWithErrorOnly = (callback) => {
                callback();
            };

            callbackToPromise(functionWithErrorOnly).then(result => {
                assert.isUndefined(result);
                done();
            }).catch(error => {
                done(error);
            });
        });
    });

    describe('#errorCallbackToPromise', function () {
        it('returns empty result when action completed successfully and no result returned', function (done) {
            const functionWithErrorOnly = (callback) => {
                callback();
            };

            errorCallbackToPromise(functionWithErrorOnly).then(result => {
                assert.isUndefined(result);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('rejects when a parameter passed to callback', function (done) {
            const result = new Error('sample error');
            const functionWithErrorOnly = (callback) => {
                callback(result);
            };

            errorCallbackToPromise(functionWithErrorOnly).then(result => {
                done(result);
            }).catch(error => {
                assert.equal(error, result)
                done();
            });
        });

        it('enables async await', async function () {
            const functionWithErrorOnly = (callback) => {
                callback();
            };

            try {
                const result = await errorCallbackToPromise(functionWithErrorOnly);
                assert.isUndefined(result);
            } catch (error) {
                assert.fail(error);
            }
        });
    });

    describe('#noErrorCallbackToPromise', function () {
        it('returns value when callback invoked', function (done) {
            const value = 'sample value';
            const functionWithValueReturnOnly = (callback) => {
                callback(value);
            };

            noErrorCallbackToPromise(functionWithValueReturnOnly).then(result => {
                assert.equal(result, value);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('enables async await', async function () {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithSimpleResult = (callback) => {
                callback(returnValue);
            };

            try {
                const result = await noErrorCallbackToPromise(functionWithSimpleResult);
                assert.deepEqual(result, returnValue);
            } catch (error) {
                assert.fail(error);
            }
        });
    });

    describe('#doubleValueCallbackToPromise', function () {
        it('rejects when the first argument in callback is an error', function (done) {
            const error = new Error('sample error');
            const functionWithErrorAsFirstParameter = (callback) => {
                callback(error, {});
            };

            doubleValueCallbackToPromise(functionWithErrorAsFirstParameter, undefined).then(_ => {
                done('The promise should be rejected');
            }, err => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('rejects when the second argument in callback is an error', function (done) {
            const error = new Error('sample error');
            const functionWithErrorAsSecondParameter = (callback) => {
                callback({}, error);
            };

            doubleValueCallbackToPromise(functionWithErrorAsSecondParameter, undefined).then(_ => {
                done('The promise should be rejected');
            }, err => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('returns single value when callback is invoked', function (done) {
            const returnValue = { key: 'sample value' }
            const functionWithErrorAsFirstParameter = (callback) => {
                callback(undefined, returnValue);
            };

            const packFunction = (error, value) => { return value; }

            doubleValueCallbackToPromise(functionWithErrorAsFirstParameter, packFunction).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns packed result when callback returns two values', function (done) {
            const returnValue = { return1: 'sample value', return2: 5 }
            const functionWithTwoReturnValues = (callback) => {
                callback(returnValue.return1, returnValue.return2);
            };

            const packFunction = (value1, value2) => { return { return1: value1, return2: value2 }; }

            doubleValueCallbackToPromise(functionWithTwoReturnValues, packFunction).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('enables async await', async function () {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithSimpleResult = (callback) => {
                callback(returnValue, undefined);
            };
            const packFunction = (value, _) => { return value; }


            try {
                const result = await doubleValueCallbackToPromise(functionWithSimpleResult, packFunction);
                assert.deepEqual(result, returnValue);
            } catch (error) {
                assert.fail(error);
            }
        });
    });
});