export type JSONValue =
 | string
 | number
 | boolean
 | null
 | JSONValue[]
 | {[key: string]: JSONValue};

export type JSONObject = {[key: string]: JSONValue};
