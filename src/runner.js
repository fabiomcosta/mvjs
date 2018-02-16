// @flow

import child_process from 'child_process';
import {promisify} from 'util';
import path from 'path';
import {createDebug, log} from './log';
import {findAllJSPaths, findProjectPath} from './path';
import {validate, normalize} from './options';
import type {Options} from './options';

const debug = createDebug(__filename);
const spawn = promisify(child_process.spawn);

export async function executeTransform(options: Options): Promise<string> {

  debug('sourcePaths', options.sourcePaths.join(' '));
  debug('targetPath', options.targetPath);

  const {absoluteSourcePaths, absoluteTargetPath} = normalize(await validate(options));

  debug('absoluteSourcePaths', `\n  ${absoluteSourcePaths.join('\n  ')}`);
  debug('absoluteTargetPath', absoluteTargetPath);

  const projectPath = await findProjectPath();
  debug('Project path', projectPath);

  const allJSPaths = await findAllJSPaths(projectPath);
  debug('Detected js paths', `\n  ${allJSPaths.join('\n  ')}`);

  // TODO MOVE FILE sourcePath -> targetPath

  const jscodeshiftBin = path.join(
    __dirname, '..', 'node_modules', '.bin', 'jscodeshift'
  );

  const cmdArgs = [
    '--silent',
    '--transform', path.join(__dirname, 'transform.js'),
    // TODO FOR NOW WE ONLY ACCEPT 1 SOURCE PATH
    '--absoluteSourcePath', absoluteSourcePaths[0],
    '--absoluteTargetPath', absoluteTargetPath,
    ...allJSPaths
  ];

  return await spawn(
    jscodeshiftBin,
    cmdArgs,
    { stdio: 'inherit' }
  );
}

