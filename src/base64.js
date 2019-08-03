// @flow

export function objectToBase64(obj: Object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

export function base64ToObject(base64String: string): Object {
  return JSON.parse(Buffer.from(base64String, 'base64').toString('utf8'));
}
