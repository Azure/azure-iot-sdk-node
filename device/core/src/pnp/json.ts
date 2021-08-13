export type JSONSerializableValue =
 | string
 | number
 | boolean
 | null
 | JSONSerializableValue[]
 | {[key: string]: JSONSerializableValue};

export type JSONSerializableObject = {[key: string]: JSONSerializableValue};
