// @flow

import path from 'path';
import { createTemporaryFs, isFile } from './utils';
import { move } from '../move';

describe('move', () => {
  test('moves sources with absolute paths', async () => {
    const { cwd } = await createTemporaryFs({
      './foo.js': '',
      './bar.js': '',
      './baz/': '',
    });
    const join = path.join.bind(path, cwd);
    await move({
      sourcePaths: [join('./foo.js'), join('./bar.js')],
      targetPath: join('./baz'),
    });
    expect(await isFile(join('./baz/foo.js'))).toEqual(true);
    expect(await isFile(join('./baz/bar.js'))).toEqual(true);
  });
});
