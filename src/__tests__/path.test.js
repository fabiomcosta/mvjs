// @flow

import {mockDescriptor, createFakeContext} from './utils';
import {findProjectPath, findAllJSPaths, matchPathStyle, updateSourcePath} from '../path';

mockDescriptor(process, 'cwd', { value: jest.fn() });

jest.mock('../log', () => {
  const debug = jest.fn();
  return {
    $debug: debug,
    warn: jest.fn(),
    createDebug: () => debug
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


jest.mock('glob', () => jest.fn((glob, cb) => cb(null, [glob, '/a/node_modules/b.js', '/c/d.js'])));

describe('findAllJSPaths', () => {

  // TODO: this would be better covered by an integration test
  test('returns all glob paths filtering out paths containing "node_modules"', async () => {
    const allJSPaths = await findAllJSPaths('/c');
    expect(allJSPaths).toEqual(['/c/**/*.js', '/c/d.js']);
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
    // $FlowIgnore $debug only exists because we mocked `log`
    const debug = require('../log').$debug;
    const context = createFakeContext({ path: '/a/b.js' });
    updateSourcePath(context, '/c/d');
    expect(debug).toHaveBeenCalledWith(`Ignoring absolute path "/c/d" from "/a/b.js".`);
  });

  test(`ignores if the absolute import path does NOT match the absolute 'sourcePath'`, () => {
    const context = createFakeContext(
      { path: '/a/b/c.js' },
      { absoluteSourcePath: '/a/b/d.js' }
    );
    expect(updateSourcePath(context, './e.js')).toBe('./e.js');
  });

  test(`updates the sourcePath`, () => {
    // $FlowIgnore $debug only exists because we mocked `log`
    const debug = require('../log').$debug;
    const context = createFakeContext(
      { path: '/a/b/c.js' },
      { absoluteSourcePath: '/a/b/d.js', absoluteTargetPath: '/a/b/e.js' }
    );
    expect(updateSourcePath(context, './d')).toBe('./e');
    expect(debug).toHaveBeenCalledWith(`Updating /a/b/c.js: ./d -> ./e`);
  });

});
