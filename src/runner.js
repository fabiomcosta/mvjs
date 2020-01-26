// @flow

import path from 'path';
import { isBinaryFile} from 'isbinaryfile';
import {createDebug, info} from './log';
import {findAllPathsCategorized, findProjectPath, expandDirectoryPaths, readFile, writeFile, updateSourcePath} from './path';
import {validate, createMovePaths, DEFAULT, JS_EXTENSIONS, type MoveOptions, type PathMap} from './options';
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

async function promiseObject(object: { [string]: Promise<mixed> | mixed }): Promise<{ [string]: mixed }> {
  return await Promise.all(Object.entries(object).map(entry => Promise.all(entry)))
    .then(entries => entries.reduce((acc, entry) => { const [k,v] = entry; acc[k] = v; return acc; }, {}));
}

async function genericTransform(paths: Array<string>, options: ParsedOptions): Promise<void> {
  // $FlowFixMe :shrug:
  for await (const {_path, content} of paths.map(p => promiseObject({_path: p, content: readFile(p)}))) {
    const isFileBinary = await isBinaryFile(content);
    // Ignore binary files
    if (isFileBinary) {
      return;
    }

    const transformedContent = String(content).replace(/(['"])([ \t]*\.\.?\/[^\1]*?)\1/g, (_, quote, filePath) => {
      // Context object with a similar shape to the one provided by the jscodeshift
      // transform. It contains the values that are actually used by `updateSourcePath`.
      const context = {
        j: null,
        file: {path: _path, source: ''},
        options
      };
      return `${quote}${updateSourcePath(context, filePath.trim())}${quote}`;
    });

    await writeFile(_path, transformedContent, 'utf-8');
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

  const {js: allJSPaths, others: allOtherPaths} = await findAllPathsCategorized(projectPath);
  debug('Detected js paths', `\n  ${allJSPaths.join('\n  ')}`);

  const transformOptions: ParsedOptions = {
    expandedPaths,
    recastOptions
  };

  await Promise.all([
    genericTransform(allOtherPaths, transformOptions),
    Runner.run(path.join(__dirname, 'transform.js'), allJSPaths, {
      silent: true,
      verbose: 0,
      extensions: Array.from(JS_EXTENSIONS).join(','),
      parser: options.parser || DEFAULT.parser,
      options: transformOptions
    })
  ]);
}

type Options = MoveOptions & TransformOptions;

export async function transform(options: Options): Promise<void> {
  const expandedPaths = await expandDirectoryPaths(createMovePaths(await validate(options)));
  await executeTransform({
    ...options,
    expandedPaths
  });
}
