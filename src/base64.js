// @flow

export function objectToBase64(obj: Object): string {
  return new Buffer(JSON.stringify(obj)).toString('base64');
}

export function base64ToObject(base64String: string): Object {
  return JSON.parse(new Buffer(base64String, 'base64').toString('utf8'));
}
