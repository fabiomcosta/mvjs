// @flow

import {execFile} from 'child_process';
import path from 'path';
import {createDebug, info} from './log';
import {findAllJSPaths, findProjectPath, expandDirectoryPaths} from './path';
import {objectToBase64} from './base64';
import {validate, createMovePaths, DEFAULT, SUPPORTED_EXTENSIONS, type MoveOptions, type PathMap} from './options';
import type {ParsedOptions} from './transform';

const debug = createDebug(__filename);

type TransformOptions = {
  // see https://github.com/facebook/jscodeshift#parser
  parser?: 'flow' | 'babylon' | 'babel',
  // see https://github.com/benjamn/recast/blob/master/lib/options.js
  recastOptions?: Object
};

type NormalizedOptions = {
  expandedPaths: PathMap
} & TransformOptions;

// Jest is probably doing some magic and is not properly logging the output from the jscodeshift child process.
// This helps make us at least see outputs when running out unit tests on Jest.
function stdoutLog(data) {
  if (process.env.JEST_WORKER_ID) {
    console.log(data);
  } else  {
    process.stdout.write(data);
  }
}

function stderrLog(data) {
  if (process.env.JEST_WORKER_ID) {
    console.error(data);
  } else {
    process.stderr.write(data);
  }
}

export async function executeTransform(options: NormalizedOptions): Promise<void> {

  const {expandedPaths} = options;
  debug('expandedPaths', JSON.stringify(expandedPaths, null, 2));

  const projectPath = await findProjectPath();
  info(`Detected project path: ${projectPath}`);

  const recastOptions = {...DEFAULT.recast, ...options.recastOptions};
  // I'm considering that when there are no recast options it's because the
  // user doesn't care much about these options, so we only log them when
  // any recast option is passed.
  if (options.recastOptions) {
    info(`Recast options:\n${JSON.stringify(recastOptions, null, 2)}`);
  }

  const allJSPaths = await findAllJSPaths(projectPath);
  debug('Detected js paths', `\n  ${allJSPaths.join('\n  ')}`);

  const transformOptions: ParsedOptions = {
    expandedPaths,
    recastOptions
  };

  const jscodeshiftBin = path.join(
    __dirname, '..', 'node_modules', '.bin', 'jscodeshift'
  );

  const cmdArgs = allJSPaths.concat([
    '--extensions', Array.from(SUPPORTED_EXTENSIONS).join(','),
    '--transform', path.join(__dirname, 'transform.js'),
    '--parser', options.parser || DEFAULT.parser,
    '--silent',
    '--options', objectToBase64(transformOptions)
  ]);

  const jscodeshift = execFile(jscodeshiftBin, cmdArgs);
  jscodeshift.stdout.on('data', stdoutLog);
  jscodeshift.stderr.on('data', stderrLog);
  // Making sure the caller awaits until the jscodeshift process closes.
  return await new Promise(res => jscodeshift.on('close', res));
}

type Options = MoveOptions & TransformOptions;

export async function transform(options: Options): Promise<void> {
  const expandedPaths = await expandDirectoryPaths(createMovePaths(await validate(options)));
  await executeTransform({
    ...options,
    expandedPaths
  });
}
