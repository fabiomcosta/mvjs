// @flow

import path from 'path';
import requireResolve from '../requireResolve';
import {createFakeContext, createTemporaryFs} from './utils';

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
      `File "/a/b/c.js" is importing "/a.js" but it does not exist.`
    );
  });

  test('resolves the path to a folder with an index.ts inside it', async () => {
    const context = createFakeContext(
      {path: ''}
    );
    const {cwd} = await createTemporaryFs({
      './c/index.ts': ''
    });
    expect(requireResolve(context, path.join(cwd, 'c'))).toEqual(path.join(cwd, 'c/index.ts'));
  });

  test('resolves the path to a folder with an index.tsx inside it', async () => {
    const context = createFakeContext(
      {path: ''}
    );
    const {cwd} = await createTemporaryFs({
      './c/index.tsx': ''
    });
    expect(requireResolve(context, path.join(cwd, 'c'))).toEqual(path.join(cwd, 'c/index.tsx'));
  });
});
