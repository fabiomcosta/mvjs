// @flow

import path from 'path';
import {normalize} from '../options';

describe('normalize', () => {
  test('normalizes sourcePaths and targetPaths into a PathMap', async () => {
    const cwd = process.cwd();
    const pathMap = normalize({
      sourcePaths: ['./foo.js', './a/bar.js'],
      targetPath: './baz'
    });
    const join = path.join.bind(path, cwd);
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./baz/foo.js'),
      [join('./a/bar.js')]: join('./baz/bar.js')
    });
  });
});
