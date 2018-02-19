// @flow

import path from 'path';
import fs from 'fs';
import child_process from 'child_process';
import {promisify} from 'util';
import {createTemporaryFs} from '../utils';
import type {FsDefinition} from '../utils';
import type {ChildProcess} from 'child_process';

const exec = promisify(child_process.exec);
const readFile = promisify(fs.readFile);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

jest.setTimeout(8000);

async function readFileString(_path: string): Promise<string> {
  return String(await readFile(_path));
}

async function _exec(args: Array<string>, cwd=__dirname): Promise<ChildProcess> {
  const cliPath = path.join(PROJECT_ROOT, 'lib', 'cli.js');
  const cmd = `node ${cliPath} ${args.join(' ')}`;
  const childProcess = await exec(cmd, { cwd });
  const {stdout, stderr} = childProcess;
  // eslint-disable-next-line no-console
  console.log(`EXEC ${cmd}\ncwd=${cwd}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  return childProcess;
}

type TmpFsObject = {
  cwd: string,
  exec: (Array<string>) => Promise<ChildProcess>
};
type TmpFsCallback = (TmpFsObject) => mixed;
async function createTmpFs(definition: FsDefinition, callback: TmpFsCallback): Promise<void> {
  const fsDescriptor = await createTemporaryFs(definition);
  await callback({
    cwd: fsDescriptor.root,
    async exec(args: Array<string>): Promise<ChildProcess> {
      return await _exec(args, fsDescriptor.root);
    }
  });
  await fsDescriptor.cleanup();
}

describe('cli', () => {

  test('ignores require/import paths that dont match the moved paths', async () => {
    await createTmpFs({
      './package.json': readFile(path.join(__dirname, 'package.json')),
      './a.js': '',
      './modules.js': `
// dependency or built-in
import('lodash');
require('lodash');
import 'lodash';
import _ from 'lodash';

// absolute paths
import('/src/c.js');
require('/src/c.js');
import '/src/c.js';
import _2 from '/src/c.js';

// not one of the supported AST nodes
required('nott-require');

// weird constructs
require(\`llo \${y} a \u0000\`);
require(x);
require(x + '1');`
    }, async ({ cwd, exec }) => {
      await exec(['./a.js', './b.js']);
      expect(await readFileString(path.join(cwd, './modules.js'))).toEqual(`
// dependency or built-in
import('lodash');
require('lodash');
import 'lodash';
import _ from 'lodash';

// absolute paths
import('/src/c.js');
require('/src/c.js');
import '/src/c.js';
import _2 from '/src/c.js';

// not one of the supported AST nodes
required('nott-require');

// weird constructs
require(\`llo \${y} a \u0000\`);
require(x);
require(x + '1');`
      );
    });
  });

  test('rewrites require/import paths that match the moved paths', async () => {
    await createTmpFs({
      './package.json': readFile(path.join(__dirname, 'package.json')),
      './a.js': '',
      './modules.js': `
import('./a');
require('./a.js');
require(\`./a\`);
import _3 from './a';
import './a';`
    }, async ({ cwd, exec }) => {
      await exec(['./a.js', './b.js']);
      expect(await readFileString(path.join(cwd, './modules.js'))).toEqual(`
import('./b');
require('./b.js');
require(\`./b\`);
import _3 from './b';
import './b';`
      );
    });
  });

  test('supports moving jsx files', async () => {
    await createTmpFs({
      './package.json': readFile(path.join(__dirname, 'package.json')),
      './a.jsx': '',
      './modules.jsx': `import './a.jsx';`
    }, async ({ cwd, exec }) => {
      await exec(['./a.jsx', './b.jsx']);
      expect(await readFileString(path.join(cwd, './modules.jsx')))
        .toEqual(`import './b.jsx';`);
    });
  });

  test('supports moving mjs files', async () => {
    await createTmpFs({
      './package.json': readFile(path.join(__dirname, 'package.json')),
      './a.mjs': '',
      './modules.mjs': `import './a.mjs';`
    }, async ({ cwd, exec }) => {
      await exec(['./a.mjs', './b.mjs']);
      expect(await readFileString(path.join(cwd, './modules.mjs')))
        .toEqual(`import './b.mjs';`);
    });
  });
});
