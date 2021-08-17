// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export type JSONSerializableValue =
 | string
 | number
 | boolean
 | null
 | JSONSerializableValue[]
 | {[key: string]: JSONSerializableValue};

export type JSONSerializableObject = {[key: string]: JSONSerializableValue};
