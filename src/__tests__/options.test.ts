// @ts-nocheck

import path from 'path';
import {createMovePaths} from '../options';
import {createTemporaryFs} from './utils';

async function createFsAndMovePaths({
  sourcePaths,
  targetPath,
}: {
  sourcePaths: ReadonlyArray<string>;
  targetPath: string;
}) {
  const {cwd} = await createTemporaryFs({
    [targetPath]: '',
    ...sourcePaths.reduce((acc, s) => ((acc[s] = ''), acc), {}),
  });
  const join = path.join.bind(path, cwd);
  const pathMap = await createMovePaths({
    sourcePaths: sourcePaths.map((s) => join(s)),
    targetPath: join(targetPath),
  });
  return {join, pathMap};
}

describe('normalize', () => {
  test('renames one file sourcePath to its targetPaths', async () => {
    const {join, pathMap} = await createFsAndMovePaths({
      sourcePaths: ['./foo.js'],
      targetPath: './bar.js',
    });
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./bar.js'),
    });
  });

  test('renames one directory sourcePath to its targetPaths', async () => {
    const {join, pathMap} = await createFsAndMovePaths({
      sourcePaths: ['./a/s/d'],
      targetPath: './baz',
    });
    expect(pathMap).toEqual({
      [join('./a/s/d')]: join('./baz'),
    });
  });

  test('normalizes sourcePaths and targetPaths into a PathMap', async () => {
    const {join, pathMap} = await createFsAndMovePaths({
      sourcePaths: ['./foo.js', './a/bar.js', './a/s/d'],
      targetPath: './baz/',
    });
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./baz/foo.js'),
      [join('./a/bar.js')]: join('./baz/bar.js'),
      [join('./a/s/d')]: join('./baz/d'),
    });
  });

  test('normalizes directory targetPath into a PathMap', async () => {
    const {join, pathMap} = await createFsAndMovePaths({
      sourcePaths: ['./foo.js', './a/bar.js', './a/s/d'],
      targetPath: './c/',
    });
    expect(pathMap).toEqual({
      [join('./foo.js')]: join('./c/foo.js'),
      [join('./a/bar.js')]: join('./c/bar.js'),
      [join('./a/s/d')]: join('./c/d'),
    });
  });
});
