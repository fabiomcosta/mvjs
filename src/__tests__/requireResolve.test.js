// @flow

import path from 'path';
import requireResolve from '../requireResolve';
import {createFakeContext} from './utils';

describe('requireResolve', () => {
  test('throws nice error containing the file path that contains the erroneous path', () => {
    const context = createFakeContext(
      { path: '/a/b/c.js' }
    );
    expect(() => requireResolve(context, '/a.js'))
      .toThrow(`File "/a/b/c.js" is importing "/a.js" but it does not exists.`);
  });
});
