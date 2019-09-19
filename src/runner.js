// @flow

import path from 'path';
import {createDebug, info} from './log';
import {findAllJSPaths, findProjectPath, expandDirectoryPaths} from './path';
import {validate, createMovePaths, DEFAULT, SUPPORTED_EXTENSIONS, type MoveOptions, type PathMap} from './options';
import type {ParsedOptions} from './transform';
import Runner from 'jscodeshift/src/Runner';

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

  return await Runner.run(path.join(__dirname, 'transform.js'), allJSPaths, {
    silent: true,
    verbose: 0,
    extensions: Array.from(SUPPORTED_EXTENSIONS).join(','),
    parser: options.parser || DEFAULT.parser,
    options: transformOptions
  });
}

type Options = MoveOptions & TransformOptions;

export async function transform(options: Options): Promise<void> {
  const expandedPaths = await expandDirectoryPaths(createMovePaths(await validate(options)));
  await executeTransform({
    ...options,
    expandedPaths
  });
}
