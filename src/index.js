// @flow

import '@babel/polyfill';
import child_process from 'child_process';
import {promisify} from 'util';
import path from 'path';
import {createDebug, log} from './log';
import {findAllJSPaths, findProjectPath} from './path';

const debug = createDebug(__filename);
const spawn = promisify(child_process.spawn);

type Options = {
  sourcePath: string,
  targetPath: string
};
async function executeTransform(options: Options): Promise<string> {

  validateOptions(options);

  const projectPath = await findProjectPath();
  debug('project path', projectPath);

  const allJSPaths = await findAllJSPaths();

  const { sourcePath, targetPath } = options;

  // TODO CHECK if SOURCE exists
  // TODO MOVE FILE sourcePath -> targetPath

  const absoluteSourcePath = path.resolve(sourcePath);
  const absoluteTargetPath = path.resolve(targetPath);

  debug('absolute source', absoluteSourcePath);
  debug('absolute target', absoluteTargetPath);

  const cmdArgs = [
    '-t', 'lib/transform.js',
    '--absoluteSourcePath', absoluteSourcePath,
    '--absoluteTargetPath', absoluteTargetPath,
    ...allJSPaths
  ];

  const jscodeshiftBin = path.join(
    __dirname, '..', 'node_modules', '.bin', 'jscodeshift'
  );

  return await spawn(
    jscodeshiftBin,
    cmdArgs,
    { stdio: 'inherit' }
  );
}

// TODO: support .mjs
// TODO: support .jsx
function validateOptions({ sourcePath, targetPath }: Options) {
  const sourceExt = path.extname(sourcePath);
  if (sourceExt !== '.js') {
    throw new Error(`Can't move '${sourcePath}'. '.js' is the only extension currently supported.`);
  }
  const targetExt = path.extname(targetPath);
  if (targetExt !== '.js') {
    throw new Error(`Can't move to '${targetPath}. '.js' is the only extension currently supported.`);
  }
}

(async () => {

  const sourcePath = '/Users/fcosta/Dev/own/mvjs/a.js';
  const targetPath = '/Users/fcosta/Dev/own/mvjs/b.js';

  log(
    await executeTransform({
      sourcePath,
      targetPath
    })
  );

})();
