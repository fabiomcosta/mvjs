// @flow

import path from 'path';
import {relativePath} from '../path';

const CWD = '/Users/username/folder';

beforeAll(() => {
  // $FlowIgnore
  Object.defineProperty(process, 'cwd', { value: () => CWD });
});

describe('relativePath', () => {
  test('creates the correct relative path from a relative path', () => {
    expect(relativePath('a.js', '/Users/username/other'))
      .toBe('../folder/a.js');
  });

  test('creates the correct relative path from an absolute path', () => {
    expect(relativePath('/Users/username/folder/a.js', '/Users/username/other'))
      .toBe('../folder/a.js');
  });
});
