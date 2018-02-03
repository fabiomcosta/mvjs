// @flow

import '@babel/polyfill';
import child_process from 'child_process';
import {promisify} from 'util';
import path from 'path';
import {createDebug, log} from './log';
import {relativePath, getNpmBinPath, findAllJSPaths, findProjectPath} from './path';

const debug = createDebug(__filename);
const spawn = promisify(child_process.spawn);

type Options = {
  sourcePath: string,
  targetPath: string
};
async function executeTransform(options: Options): Promise<string> {

  validateOptions(options);

  const projectPath = await findProjectPath();
  debug('project root path', projectPath);

  const allJSPaths = await findAllJSPaths();

  const { sourcePath, targetPath } = options;

  // TODO CHECK if SOURCE exists
  // TODO MOVE FILE sourcePath -> targetPath

  const relativeSourcePath = relativePath(sourcePath, projectPath);
  const relativeTargetPath = relativePath(targetPath, projectPath);

  debug('relative source', relativeSourcePath);
  debug('relative target', relativeTargetPath);

  const cmdArgs = [
    '-t', 'lib/transform.js',
    '--sourcePath', relativeSourcePath,
    '--targetPath', relativeTargetPath,
    '--projectPath', projectPath,
    ...allJSPaths
  ];

  const npmBinPath = await getNpmBinPath();
  await spawn(
    path.join(npmBinPath, 'jscodeshift'),
    cmdArgs,
    { stdio: 'inherit' }
  );

  return 'ok';
}

// TODO: support .mjs
// TODO: support .jsx
function validateOptions(options: Options) {
  const { sourcePath, targetPath } = options;
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
