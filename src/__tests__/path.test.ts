import path from 'path';
import {mockDescriptor, createFakeContext, createTemporaryFs} from './utils';
import {
  findProjectPath,
  matchPathStyle,
  updateSourcePath,
  expandDirectoryPaths,
} from '../path';

mockDescriptor(process, 'cwd', {value: jest.fn()});

jest.mock('../log', () => {
  const debug = jest.fn();
  return {
    warn: jest.fn(),
    createDebug: () => debug,
  };
});

jest.mock('find-up', () => jest.fn());

describe('findProjectPath', () => {
  test('returns the dirname of the parent folder with a package.json file', async () => {
    require('find-up').mockResolvedValue(`/a/b/c/package.json`);
    const projectPath = await findProjectPath();
    expect(projectPath).toBe('/a/b/c');
  });

  test('returns process.cwd() when a package.json can NOT be found', async () => {
    process.cwd.mockReturnValue('/cwd/value');
    require('find-up').mockResolvedValue(null);
    const projectPath = await findProjectPath();
    expect(projectPath).toBe('/cwd/value');
  });

  test('log.warn is called with a nice message', async () => {
    process.cwd.mockReturnValue('/cwd/value');
    require('find-up').mockResolvedValue(null);
    await findProjectPath();
    expect(require('../log').warn).toHaveBeenCalledWith(
      `Could not find a "package.json" file on any parent directory, ` +
        `using "/cwd/value" as a fallback.`
    );
  });
});

describe('matchPathStyle', () => {
  test('keeps the file extension if reference has it', () => {
    expect(matchPathStyle('/a/b.js', '/a/c.js')).toBe('/a/b.js');
  });
  test('removes file extension when the reference does not have one', () => {
    expect(matchPathStyle('../a/b/c/d.js', '../a/c')).toBe('../a/b/c/d');
  });
});

// fake implementation of require.resolve that just adds the `.js` extension
jest.mock('../requireResolve', () => (context, _path) => {
  if (!require('path').extname(_path)) {
    return `${_path}.js`;
  }
  return _path;
});

describe('updateSourcePath', () => {
  test('ignores non relative paths', () => {
    const context = createFakeContext();
    expect(updateSourcePath(context, 'lodash')).toBe('lodash');
  });

  test('ignores absolute paths', () => {
    const context = createFakeContext();
    expect(updateSourcePath(context, '/a/b')).toBe('/a/b');
  });

  test('debugs about the absolute path', () => {
    const debug = require('../log').createDebug('');
    const context = createFakeContext({path: '/a/b.js'});
    updateSourcePath(context, '/c/d');
    expect(debug).toHaveBeenCalledWith(
      `Ignoring absolute path "/c/d" from "/a/b.js".`
    );
  });

  test(`ignores unsupported extensions`, () => {
    const context = createFakeContext();
    expect(updateSourcePath(context, './a/b.css')).toBe('./a/b.css');
  });

  test(`ignores if the absolute import path does NOT match the absolute 'sourcePath'`, () => {
    const context = createFakeContext(
      {path: '/a/b/c.js'},
      {expandedPaths: {'/a/b/d.js': ''}}
    );
    expect(updateSourcePath(context, './e.js')).toBe('./e.js');
  });

  test(`updates the sourcePath`, () => {
    const debug = require('../log').createDebug('');
    const context = createFakeContext(
      {path: '/a/b/c.js'},
      {expandedPaths: {'/a/b/d.js': '/a/b/e.js'}}
    );
    expect(updateSourcePath(context, './d')).toBe('./e');
    expect(debug).toHaveBeenCalledWith(`Updating /a/b/c.js: ./d -> ./e`);
  });
});

describe('expandDirectoryPaths', () => {
  it('expands folder paths into descendant file paths', async () => {
    const {cwd} = await createTemporaryFs({
      './foo.js': '',
      './foo/baz.js': '',
      './foo/bar/baz.js': '',
      './foo/bar/baz.css': '',
    });
    const join = path.join.bind(path, cwd);
    const pathMap = {
      [join('./foo.js')]: join('./fuu/buz/foo/foo.js'),
      [join('./foo')]: join('./fuu/buz/foo'),
    };
    expect(await expandDirectoryPaths(pathMap)).toEqual({
      [join('./foo.js')]: join('./fuu/buz/foo/foo.js'),
      [join('./foo/baz.js')]: join('./fuu/buz/foo/baz.js'),
      [join('./foo/bar/baz.js')]: join('./fuu/buz/foo/bar/baz.js'),
      [join('./foo/bar/baz.css')]: join('./fuu/buz/foo/bar/baz.css'),
    });
  });
});
