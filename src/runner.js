// @flow

import {execFile} from 'child_process';
import {promisify} from 'util';
import path from 'path';
import fs from 'fs';
import {createDebug} from './log';
import {findAllJSPaths, findProjectPath} from './path';
import {validate, normalize, SUPPORTED_EXTENSIONS} from './options';
import {objectToBase64} from './base64';
import type {Options, NormalizedOptions} from './options';

const debug = createDebug(__filename);
const rename = promisify(fs.rename);

async function movePaths(pathMap: NormalizedOptions): Promise<void> {
  await Promise.all(
    Object.entries(pathMap)
      .map(([sourcePath, targetPath]) => rename(sourcePath, targetPath))
  );
}

export async function executeTransform(options: Options): Promise<void> {

  debug('sourcePaths', options.sourcePaths.join(' '));
  debug('targetPath', options.targetPath);

  const pathMap = normalize(await validate(options));
  debug('movePaths', JSON.stringify(pathMap, null, 2));

  const projectPath = await findProjectPath();
  debug('Project path', projectPath);

  const allJSPaths = await findAllJSPaths(projectPath);
  debug('Detected js paths', `\n  ${allJSPaths.join('\n  ')}`);

  const jscodeshiftBin = path.join(
    __dirname, '..', 'node_modules', '.bin', 'jscodeshift'
  );

  const cmdArgs = allJSPaths.concat([
    '--extensions', Array.from(SUPPORTED_EXTENSIONS).join(','),
    '--transform', path.join(__dirname, 'transform.js'),
    '--movePaths', objectToBase64(pathMap),
    '--parser', options.parser,
    '--silent'
  ]);

  const jscodeshift = execFile(
    jscodeshiftBin,
    cmdArgs
  );
  /* eslint-disable no-console */
  jscodeshift.stdout.on('data', console.log);
  jscodeshift.stderr.on('data', console.error);
  /* eslint-enable no-console */
  jscodeshift.on('close', async () => {
    await movePaths(pathMap);
  });
}

