// @flow

import path from 'path';
import {createMovePaths} from '../options';

const join = path.join.bind(path, process.cwd());

describe('normalize', () => {

  test('renames one file sourcePath to its targetPaths', async () => {
    const pathMap = createMovePaths({
      sourcePaths: ['./foo.js'],
      targetPath: './bar.js'
    });
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./bar.js'),
    });
  });

  test('renames one directory sourcePath to its targetPaths', async () => {
    const pathMap = createMovePaths({
      sourcePaths: ['./a/s/d'],
      targetPath: './baz'
    });
    expect(pathMap).toEqual({
      [join('./a/s/d')]: join('./baz'),
    });
  });

  test('normalizes sourcePaths and targetPaths into a PathMap', async () => {
    const pathMap = createMovePaths({
      sourcePaths: ['./foo.js', './a/bar.js', './a/s/d'],
      targetPath: './baz'
    });
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./baz/foo.js'),
      [join('./a/bar.js')]: join('./baz/bar.js'),
      [join('./a/s/d')]: join('./baz/d')
    });
  });
});
