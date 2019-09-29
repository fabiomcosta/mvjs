// @flow

import path from 'path';
import fs from 'fs';
import child_process from 'child_process';
import {promisify} from 'util';
import {createTemporaryFs, isFile} from '../utils';
import type {FsDefinition} from '../utils';
import type {ChildProcess} from 'child_process';

const exec = promisify(child_process.exec);
const readFile = promisify(fs.readFile);
const PROJECT_ROOT = path.resolve(path.join(__dirname, '..', '..', '..'));

jest.setTimeout(8000);

async function readFileString(_path: string): Promise<string> {
  return String(await readFile(_path));
}

async function _exec(args: Array<string>, cwd=__dirname): Promise<ChildProcess> {
  const cliPath = path.join(PROJECT_ROOT, 'lib', 'cli.js');
  const cmd = `node ${cliPath} "${args.join('" "')}"`;
  const childProcess = await exec(cmd, {cwd});
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
  const {cwd} = await createTemporaryFs({
    './package.json': '{}',
    ...definition
  });
  await callback({
    cwd,
    async exec(args: Array<string>): Promise<ChildProcess> {
      return await _exec(args, cwd);
    }
  });
}

describe('cli', () => {

  test('ignores require/import paths that dont match the moved paths', async () => {
    await createTmpFs({
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
    }, async ({cwd, exec}) => {
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

  test('changes require/import paths that match the moved paths on other modules inside the project folder', async () => {
    await createTmpFs({
      './a.js': '',
      './modules.js': `
import('./a');
require('./a.js');
require(\`./a\`);
import _3 from './a';
import './a';`
    }, async ({cwd, exec}) => {
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

  test('changes require/import inside the moved module', async () => {
    await createTmpFs({
      './a1.js': '',
      './folder/': '',
      './a.js': `import './a1';`
    }, async ({cwd, exec}) => {
      await exec(['./a.js', './folder/b.js']);
      expect(await readFileString(path.join(cwd, './folder/b.js'))).toEqual(`import '../a1';`);
    });
  });

  test('when moving multiple files, uses the destination path to update paths on the moved modules', async () => {
    await createTmpFs({
      './b.js': '',
      './other/a1.js': '',
      './folder/': '',
      './a.js': `import './other/a1'; import './b';`
    }, async ({cwd, exec}) => {
      await exec(['./a.js', './other/a1.js', './folder/']);
      expect(await readFileString(path.join(cwd, './folder/a.js'))).toEqual(`import './a1'; import '../b';`);
    });
  });

  test('when moving folder, uses the destination path to update paths on the moved modules', async () => {
    await createTmpFs({
      './source/level/a1.js': `import '../a2';`,
      './source/a2.js': ''
    }, async ({cwd, exec}) => {
      await exec(['./source', './target/']);
      expect(await readFileString(path.join(cwd, './target/level/a1.js'))).toEqual(`import '../a2';`);
    });
  });

  test('updates imports for paths with any extension', async () => {
    await createTmpFs({
      './a.someWeirdExtension': '',
      './modules.js': `import './a.someWeirdExtension';`
    }, async ({cwd, exec}) => {
      await exec(['./a.someWeirdExtension', './a.otherExt']);
      expect(await readFileString(path.join(cwd, './modules.js')))
        .toEqual(`import './a.otherExt';`);
    });
  });

  test('updates imports inside non-js modules', async () => {
    await createTmpFs({
      './a.someWeirdExtension': `@import ' ./mod les.js ';`,
      './mod les.js': ''
    }, async ({cwd, exec}) => {
      await exec(['./mod les.js', './m.js']);
      expect(await readFileString(path.join(cwd, './a.someWeirdExtension')))
        .toEqual(`@import './m.js';`);
    });
  });

  test('keeps same import style, no index suffix', async () => {
    await createTmpFs({
      './mod/index.js': '',
      './modules.js': `import './mod';`
    }, async ({cwd, exec}) => {
      await exec(['./mod', './mod2']);
      expect(await readFileString(path.join(cwd, './modules.js')))
        .toEqual(`import './mod2';`);
    });
  });

  test('keeps same import style, keeps index suffix if already present', async () => {
    await createTmpFs({
      './mod/index.js': '',
      './modules.js': `import './mod/index';`
    }, async ({cwd, exec}) => {
      await exec(['./mod', './mod2']);
      expect(await readFileString(path.join(cwd, './modules.js')))
        .toEqual(`import './mod2/index';`);
    });
  });

  test('moves jsx files', async () => {
    await createTmpFs({
      './a.jsx': '',
      './modules.jsx': `import './a.jsx';`
    }, async ({cwd, exec}) => {
      await exec(['./a.jsx', './b.jsx']);
      expect(await readFileString(path.join(cwd, './modules.jsx')))
        .toEqual(`import './b.jsx';`);
      expect(await isFile(path.join(cwd, './b.jsx'))).toEqual(true);
    });
  });

  test('moves mjs files', async () => {
    await createTmpFs({
      './a.mjs': '',
      './modules.mjs': `import './a.mjs';`
    }, async ({cwd, exec}) => {
      await exec(['./a.mjs', './b.mjs']);
      expect(await readFileString(path.join(cwd, './modules.mjs')))
        .toEqual(`import './b.mjs';`);
      expect(await isFile(path.join(cwd, './b.mjs'))).toEqual(true);
    });
  });

  test('moves multiple sources to a folder', async () => {
    await createTmpFs({
      './a.js': '',
      './b.js': '',
      './c/': '',
      './modules.js': `import './a.js'; import './b';`
    }, async ({cwd, exec}) => {
      await exec(['./a.js', './b.js', './c']);
      expect(await readFileString(path.join(cwd, './modules.js')))
        .toEqual(`import './c/a.js'; import './c/b';`);
      expect(await isFile(path.join(cwd, './c/a.js'))).toEqual(true);
      expect(await isFile(path.join(cwd, './c/b.js'))).toEqual(true);
    });
  });

  test('forwards recast options', async () => {
    await createTmpFs({
      './a.js': '',
      './modules.js': `import './a.js'`
    }, async ({cwd, exec}) => {
      await exec(['--recast.quote="double"', './a.js', './b.js']);
      expect(await readFileString(path.join(cwd, './modules.js')))
        .toEqual(`import "./b.js"`);
    });
  });

  test('moves a source folder, and its files, to another folder', async () => {
    await createTmpFs({
      './a/foo.js': '',
      './a/b/bar.js': '',
      './modules.js': `import './a/foo.js'; import './a/b/bar.js';`
    }, async ({cwd, exec}) => {
      const join = path.join.bind(path, cwd);
      await exec(['./a', './c/d']);
      expect(await readFileString(join('./modules.js')))
        .toEqual(`import './c/d/foo.js'; import './c/d/b/bar.js';`);
      expect(await isFile(join('./c/d/foo.js'))).toEqual(true);
      expect(await isFile(join('./c/d/b/bar.js'))).toEqual(true);
    });
  });
});
