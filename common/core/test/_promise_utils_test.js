// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var callbackToPromise = require('../lib/promise_utils').callbackToPromise;
var errorCallbackToPromise = require('../lib/promise_utils').errorCallbackToPromise;
var noErrorCallbackToPromise = require('../lib/promise_utils').noErrorCallbackToPromise;
var doubleValueCallbackToPromise = require('../lib/promise_utils').doubleValueCallbackToPromise;
var tripleValueCallbackToPromise = require('../lib/promise_utils').tripleValueCallbackToPromise;
var httpCallbackToPromise = require('../lib/promise_utils').httpCallbackToPromise;

describe('PromiseUtils', () => {
    describe('#callbackToPromise', () => {
        it('executes user callback when passed', function (done) {
            const functionWithCallback = (callback) => {
                callback(undefined, 42);
            };

            const callback = (error, result) => {
                assert.equal(result, 42);
                assert.isUndefined(error);
                done();
            };

            const promise = callbackToPromise(functionWithCallback, callback);
            assert.isUndefined(promise);
        });

        it('throws when user callback is not a Function', function(done) {
            const functionWithCallback = (callback) => {
                callback();
            };
            const userCallback = 42;

            assert.throws(function() {
                callbackToPromise(functionWithCallback, userCallback);
                done("It should never reach this code")
            }, TypeError);

            done();
        });

        it('throws when an Error is thrown', function() {
            const functionWithCallback = (_) => {
                throw new Error();
            };

            callbackToPromise(functionWithCallback)
                .then(res => assert.fail(res), err => assert.isDefined(err));
        });

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
            const functionWithComplexResult = (callback) => {
                callback(undefined, returnValue);
            }

            callbackToPromise(functionWithComplexResult).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns complex object properly from long running operation', (done) => {
            const returnValue = {
                key: 'value',
                id: 42
            };
            const functionWithComplexResult = (callback) => {
                setTimeout(() => callback(undefined, returnValue), 1000);
            };

            callbackToPromise(functionWithComplexResult).then(result => {
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
        it('executes user callback when passed', function (done) {
            const error = new Error('sample error');
            const functionWithCallback = (callback) => {
                callback(error);
            };

            const callback = (err) => {
                assert.equal(err, error);
                done();
            };

            const promise = errorCallbackToPromise(functionWithCallback, callback);
            assert.isUndefined(promise);
        });

        it('throws when user callback is not a Function', function(done) {
            const functionWithCallback = (callback) => {
                callback();
            };
            const userCallback = 42;

            assert.throws(function() {
                errorCallbackToPromise(functionWithCallback, userCallback);
                done("It should never reach this code")
            }, TypeError);

            done();
        });

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

    });

    describe('#noErrorCallbackToPromise', function () {
        it('executes user callback when passed', function (done) {
            const functionWithCallback = (callback) => {
                callback(42);
            };

            const callback = (result) => {
                assert.equal(result, 42);
                done();
            };

            const promise = noErrorCallbackToPromise(functionWithCallback, callback);
            assert.undefined(promise);
        });

        it('throws when user callback is not a Function', function(done) {
            const functionWithCallback = (callback) => {
                callback();
            };
            const userCallback = 42;

            assert.throws(function() {
                noErrorCallbackToPromise(functionWithCallback, userCallback);
                done("It should never reach this code")
            }, TypeError);

            done();
        });

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

    });

    describe('#doubleValueCallbackToPromise', function () {
        it('executes user callback when passed', function (done) {
            const functionWithCallback = (callback) => {
                callback("result", 42);
            };

            const callback = (result1, result2) => {
                assert.equal(result1, "result");
                assert.equal(result2, 42);
                done();
            };

            const promise = doubleValueCallbackToPromise(functionWithCallback, undefined, callback);
            assert.isUndefined(promise);
        });

        it('throws when user callback is not a Function', function(done) {
            const functionWithCallback = (callback) => {
                callback();
            };
            const userCallback = 42;

            assert.throws(function() {
                doubleValueCallbackToPromise(functionWithCallback, undefined, userCallback);
                done("It should never reach this code")
            }, TypeError);

            done();
        });

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

    });

    describe('#tripleValueCallbackToPromise', function() {
        it('executes user callback when passed', function (done) {
            const error = new Error('sample error');
            const functionWithCallback = (callback) => {
                callback(error, "result", 42);
            };

            const callback = (err, result1, result2) => {
                assert.equal(result1, "result");
                assert.equal(result2, 42);
                assert.equal(err, error);
                done();
            };

            const promise = tripleValueCallbackToPromise(functionWithCallback, undefined, callback);
            assert.isUndefined(promise);
        });

        it('throws when user callback is not a Function', function(done) {
            const functionWithCallback = (callback) => {
                callback();
            };
            const userCallback = 42;

            assert.throws(function() {
                tripleValueCallbackToPromise(functionWithCallback, undefined, userCallback);
                done("It should never reach this code")
            }, TypeError);

            done();
        });

        it('rejects when an error is present', function (done) {
            const error = new Error('sample error');
            const functionWithErrorAsFirstParameter = (callback) => {
                callback(error);
            };

            tripleValueCallbackToPromise(functionWithErrorAsFirstParameter, undefined).then(_ => {
                done('The promise should be rejected');
            }, err => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('returns single value when callback is invoked', function (done) {
            const returnValue = { key: 'sample value' }
            const functionWithErrorAsFirstParameter = (callback) => {
                callback(undefined, returnValue, undefined);
            };

            const packFunction = (value1, value2) => { return { val1: value1, val2: value2 }; }

            tripleValueCallbackToPromise(functionWithErrorAsFirstParameter, packFunction).then(result => {
                assert.deepEqual(result.val1, returnValue);
                assert.isUndefined(result.val2);
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('returns packed result when callback returns two values', function (done) {
            const returnValue = { return1: 'sample value', return2: 5 }
            const functionWithTwoReturnValues = (callback) => {
                callback(undefined, returnValue.return1, returnValue.return2);
            };

            const packFunction = (value1, value2) => { return { return1: value1, return2: value2 }; }

            tripleValueCallbackToPromise(functionWithTwoReturnValues, packFunction).then(result => {
                assert.deepEqual(result, returnValue);
                done();
            }).catch(error => {
                done(error);
            });
        });

    });

    describe('#httpCallbackToPromise', function() {
        it('executes user callback when passed', function (done) {
            const error = new Error('sample error');
            const httpResponse = { body: "result" };
            const functionWithCallback = (callback) => {
                callback(error, "result", httpResponse);
            };

            const callback = (err, result1, result2) => {
                assert.equal(result1, "result");
                assert.equal(result2, httpResponse);
                assert.equal(err, error);
                done();
            };

            const promise = httpCallbackToPromise(functionWithCallback, callback);
            assert.isUndefined(promise);
        });

        it('returns a promise when no callback specified', function (done) {
            const httpResponse = { body: "result" };
            const functionWithCallback = (callback) => {
                callback(undefined, "result", httpResponse);
            };

            const promise = httpCallbackToPromise(functionWithCallback);
            promise.then(res => {
                assert.equal(res.responseBody, "result");
                assert.equal(res.httpResponse, httpResponse);
                done();
            });
        });
    });
});