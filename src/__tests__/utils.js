// @flow

import type {Context} from '../transform';

export function mockDescriptor(obj: Object, propertyName: string, descriptor: Object): void {
  let currentDescriptor;
  beforeEach(() => {
    currentDescriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    // $FlowIgnore
    Object.defineProperty(process, propertyName, descriptor);
  });
  afterEach(() => {
    // $FlowIgnore
    Object.defineProperty(process, propertyName, currentDescriptor);
  });
}

export function createFakeContext(file?: Object, options?: Object): Context {
  return {
    j: {},
    file: { path: '', ...file },
    options: { absoluteSourcePath: '', absoluteTargetPath: '', ...options }
  };
}
