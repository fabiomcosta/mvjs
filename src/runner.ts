import path from 'path';
import {isBinaryFile} from 'isbinaryfile';
import {createDebug, info} from './log';
import {
  findAllPathsCategorized,
  findProjectPath,
  expandDirectoryPaths,
  readFile,
  writeFile,
  updateSourcePath,
} from './path';
import {validate, createMovePaths, DEFAULT, JS_EXTENSIONS} from './options';
import type {MoveOptions, PathMap} from './options';
import type {ParsedOptions} from './transform';
import Runner from 'jscodeshift/src/Runner';

const debug = createDebug(__filename);

type TransformOptions = {
  // see https://github.com/facebook/jscodeshift#parser
  parser?: 'flow' | 'babylon' | 'babel';
  // see https://github.com/benjamn/recast/blob/master/lib/options.ts
  recastOptions?: any;
  ignorePattern: Array<string>;
};

type NormalizedOptions = {
  expandedPaths: PathMap;
} & TransformOptions;

async function promiseObject(object: {
  [key: string]: Promise<unknown> | unknown;
}): Promise<{ [key: string]: unknown }> {
  return await Promise.all(
    Object.entries(object).map((entry) => Promise.all(entry))
  ).then((entries) =>
    entries.reduce((acc, entry) => {
      const [k, v] = entry;
      acc[k] = v;
      return acc;
    }, {} as {[key: string]: unknown})
  );
}

async function genericTransform(
  paths: Array<string>,
  options: ParsedOptions
): Promise<void> {
  for await (const {_path, content} of paths.map((p) =>
    promiseObject({_path: p, content: readFile(p)})
  )) {
    const isFileBinary = await isBinaryFile(content);
    // Ignore binary files
    if (isFileBinary) {
      continue;
    }

    // Best guess on matching file paths on non-js files.
    // Leaning more on strictness, and avoiding detecting incorrect paths.
    //
    // Some of the rules include:
    // * the path can't have spaces
    // * the path has to be relative
    // * the path has to be surrounded by either single or double quotes
    const transformedContent = String(content).replace(
      /(['"])([\t ]*\.\.?\/[^\1\t ]*?)[\t ]*\1/g,
      (_, quote, filePath) => {
        // Context object with a similar shape to the one provided by the jscodeshift
        // transform. It contains the values that are actually used by `updateSourcePath`.
        const context = {
          j: null,
          file: {path: _path, source: ''},
          options,
        };
        return `${quote}${updateSourcePath(context, filePath.trim())}${quote}`;
      }
    );

    await writeFile(_path, transformedContent, 'utf-8');
  }
}

export async function executeTransform(
  options: NormalizedOptions
): Promise<void> {
  const {expandedPaths, ignorePattern} = options;
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

  const {
    js: allJSPaths,
    others: allOtherPaths,
  } = await findAllPathsCategorized(projectPath, {ignorePattern});
  debug('Detected js paths', `\n  ${allJSPaths.join('\n  ')}`);

  const transformOptions: ParsedOptions = {
    expandedPaths,
    recastOptions,
  };

  await Promise.all([
    genericTransform(allOtherPaths, transformOptions),
    Runner.run(path.join(__dirname, 'transform.js'), allJSPaths, {
      silent: true,
      verbose: 0,
      extensions: Array.from(JS_EXTENSIONS).join(','),
      parser: options.parser || DEFAULT.parser,
      options: transformOptions,
    }),
  ]);
}

type Options = MoveOptions & TransformOptions;

export async function transform(options: Options): Promise<void> {
  const expandedPaths = await expandDirectoryPaths(
    await createMovePaths(await validate(options))
  );
  await executeTransform({
    ...options,
    expandedPaths,
  });
}
