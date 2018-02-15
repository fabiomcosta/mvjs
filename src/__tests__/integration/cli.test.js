// @flow

import path from 'path';
import child_process from 'child_process';
import {promisify} from 'util';

const exec = promisify(child_process.exec);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

jest.setTimeout(8000);

async function _exec(args: Array<string>) {
  const cliPath = path.join(PROJECT_ROOT, 'lib', 'cli.js');
  return await exec(`node ${cliPath} ${args.join(' ')}`, {
    cwd: __dirname
  });
}

describe('cli', () => {

  test('runs', async () => {
    await _exec(['./a.js', './b.js']);
  });

});
