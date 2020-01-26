// @flow

import requireResolve from '../requireResolve';
import {createFakeContext} from './utils';

jest.mock('../log', () => {
  const debug = jest.fn();
  return {
    warn: jest.fn(),
    createDebug: () => debug
  };
});

describe('requireResolve', () => {
  test('nicely warns with message containing the file path that contains the erroneous path', () => {
    const context = createFakeContext(
      {path: '/a/b/c.js'}
    );
    requireResolve(context, '/a.js');
    expect(require('../log').warn).toHaveBeenCalledWith(
      `File "/a/b/c.js" is importing "/a.js" but it does not exists.`
    );
  });
});
