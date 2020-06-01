import path from 'path';
import fs from 'fs';
import findUp from 'find-up';
import { promisify } from 'util';
import ignore from 'ignore';
import requireResolve from './requireResolve';
import { createDebug, warn } from './log';
import { JS_EXTENSIONS_DOTTED } from './options';
import type { PathMap } from './options';
import type { Context } from './transform';

const { hasOwnProperty } = Object.prototype;
const debug = createDebug(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);

/**
 * Makes sure a path always starts with `/` or `./`.
 * Ex: a.js -> ./a.js
 */
function normalizePath(_path: string): string {
  if (_path.startsWith('.') || path.isAbsolute(_path)) {
    return _path;
  }
  return `./${_path}`;
}

/**
 * When changing the import declarations on existing modules, the updated path
 * should have a similar style to the current path.
 *
 * Ex:
 * -> import x from '../a';
 * <- import x from '../b'; // and not '../b.js'
 *
 * -> import x from '../a/index';
 * <- import x from '../b/index'; // and not '../b'
 */
export function matchPathStyle(_path: string, referencePath: string): string {
  const referenceExt = path.extname(referencePath);

  // referencePath has an extension, let's keep it
  if (referenceExt) {
    return _path;
  }

  const referenceBasename = path.basename(referencePath, referenceExt);

  const pathExt = path.extname(_path);
  const pathBasename = path.basename(_path, pathExt);
  const pathDirname = path.dirname(_path);

  // Remove `index` from path if reference doesn't have it
  if (pathBasename === 'index' && referenceBasename !== 'index') {
    return pathDirname;
  }

  return path.join(pathDirname, pathBasename);
}

/**
 * Returns the absolute path that represents the path from the source file if
 * the current `file.path` was importing the source.
 * With this value we can check if the relative importSourcePath matches the
 * provided `sourcePath`.
 */
function getAbsoluteImportSourcePath(
  context: Context,
  importSourcePath: string
): string {
  const { file } = context;
  const absolutePath = path.resolve(path.dirname(file.path), importSourcePath);
  if (pathHasJSExtension(file.path)) {
    // It only makes sense to use requireResolve on JS files
    return requireResolve(context, absolutePath);
  }
  return absolutePath;
}

/**
 * Returns a relative path from `sourcePath` to `targetPath`, using `referencePath` as a "style" or "format" reference.
 * Ex:
 * sourcePath: './folder/a.js'
 * targetPath: './b.js'
 * referencePath: './folder/a'
 * -> '../b'
 */
function generateRelativeNormalizedPath(
  sourcePath: string,
  targetPath: string,
  referencePath: string
): string {
  return normalizePath(
    matchPathStyle(
      path.relative(path.dirname(sourcePath), targetPath),
      referencePath
    )
  );
}

function generateSourcePathForExternalModule(
  sourcePath: string,
  targetPath: string,
  importSourcePath: string
): string {
  // On file `./src/c.js`
  // When moving `a.js` to `b.js`
  // import x from '../a'; -> import x from '../b;
  const targetImportSourcePath = generateRelativeNormalizedPath(
    sourcePath,
    targetPath,
    importSourcePath
  );

  debug(
    `Updating ${sourcePath}: ${importSourcePath} -> ${targetImportSourcePath}`
  );

  return targetImportSourcePath;
}

function generateSourcePathForMovedModule(
  sourcePath: string,
  targetPath: string,
  importSourcePath: string,
  absoluteImportPath: string
): string {
  // On file `./c.js`
  // When moving `./c.js` to `./src/c.js`
  // import x from './a'; -> import x from '../a';
  const targetImportSourcePath = generateRelativeNormalizedPath(
    targetPath,
    absoluteImportPath,
    importSourcePath
  );

  debug(
    `Updating ${sourcePath}: ${importSourcePath} -> ${targetImportSourcePath}`
  );

  return targetImportSourcePath;
}

export function updateSourcePath(
  context: Context,
  importSourcePath: string
): string {
  const { file } = context;

  // absolute paths...
  // They are generaly not used "as-is", but there is a babel plugin that
  // allows absolute paths.
  // https://www.npmjs.com/package/babel-plugin-root-import
  // We are not going to do anything about it.
  if (path.isAbsolute(importSourcePath)) {
    debug(`Ignoring absolute path "${importSourcePath}" from "${file.path}".`);
    return importSourcePath;
  }

  // Not an absolute path and not a relative path, it's either a built-in
  // module or a dependency, ignore it.
  if (!importSourcePath.startsWith('.')) {
    return importSourcePath;
  }

  const { options } = context;
  const absoluteImportSourcePath = getAbsoluteImportSourcePath(
    context,
    importSourcePath
  );

  // The current transformed file is being moved, we need to update its imports
  if (hasOwnProperty.call(options.expandedPaths, file.path)) {
    const currentFileTargetPath = options.expandedPaths[file.path];
    const absoluteImportPath =
      options.expandedPaths[absoluteImportSourcePath] ||
      absoluteImportSourcePath;
    return generateSourcePathForMovedModule(
      file.path,
      currentFileTargetPath,
      importSourcePath,
      absoluteImportPath
    );
  }

  // The import contains a path to a file that is being moved
  if (hasOwnProperty.call(options.expandedPaths, absoluteImportSourcePath)) {
    const currentFileTargetPath = options.expandedPaths[file.path] || file.path;
    const targetPath = options.expandedPaths[absoluteImportSourcePath];
    return generateSourcePathForExternalModule(
      currentFileTargetPath,
      targetPath,
      importSourcePath
    );
  }

  return importSourcePath;
}

export async function findProjectPath(): Promise<string> {
  const projectPackageJson = await findUp('package.json');
  if (projectPackageJson == null) {
    const cwd = process.cwd();
    warn(
      `Could not find a "package.json" file on any parent directory, using "${cwd}" as a fallback.`
    );
    return cwd;
  }
  return path.dirname(projectPackageJson);
}

function splitByFilter(
  array: Array<string>,
  filterFn: (a: string) => boolean
): [Array<string>, Array<string>] {
  const truthyValues: Array<string> = [];
  const falsyValues: Array<string> = [];
  array.forEach((value) => {
    const arr = filterFn(value) ? truthyValues : falsyValues;
    arr.push(value);
  });
  return [truthyValues, falsyValues];
}

function pathHasExtension(_path: string, extensions: Set<string>): boolean {
  return extensions.has(path.extname(_path));
}

function pathHasJSExtension(_path: string): boolean {
  return pathHasExtension(_path, JS_EXTENSIONS_DOTTED);
}

const IGNORED_FOLDERS = new Set(['node_modules', '.git', '.hg']);

type FindAllOptions = {
  ignorePattern: Array<string>;
};

// TODO: use `git ls-files` and `hg manifest` to consider ignored files.
// Note that the .git and .hg folder would need to match the package.json
// folder for this to work properly.
export async function findAllJSPaths(rootPath: string): Promise<Array<string>> {
  return await findAllPaths(rootPath, JS_EXTENSIONS_DOTTED);
}

function applyIgnoreFilter(paths, ignorePattern) {
  if (!ignorePattern.length) {
    return paths;
  }
  const cwd = process.cwd();
  const ig = ignore().add(ignorePattern);
  return paths.filter((absPath) => !ig.ignores(path.relative(cwd, absPath)));
}

export async function findAllPathsCategorized(
  rootPath: string,
  options: FindAllOptions
): Promise<{ js: Array<string>; others: Array<string> }> {
  const allPaths = await findAllPaths(rootPath);
  const filteredPaths = applyIgnoreFilter(allPaths, options.ignorePattern);
  const [js, others] = splitByFilter(filteredPaths, pathHasJSExtension);
  return { js, others };
}

async function findAllPaths(
  rootPath: string,
  supportedExtensions?: Set<string>
): Promise<Array<string>> {
  const subFiles = await readdir(rootPath);
  const files = await Promise.all(
    subFiles.map(async (subFile) => {
      const res = path.join(rootPath, subFile);
      if ((await stat(res)).isDirectory()) {
        if (IGNORED_FOLDERS.has(subFile)) {
          return null;
        }
        return findAllPaths(res, supportedExtensions);
      } else if (
        supportedExtensions &&
        !pathHasExtension(subFile, supportedExtensions)
      ) {
        return null;
      }
      return res;
    })
  );
  return files.filter(Boolean).reduce((a, f) => a.concat(f), []);
}

/**
 * Expands directory sourcePaths into its children files with supported
 * file extensions.
 * Ex:
 * <-
 * { '/foo/bar': '/foo/bar/baz' }
 * ->
 * {
 *   '/foo/bar/a.js': '/foo/bar/baz/a.js',
 *   '/foo/bar/b/c.js': '/foo/bar/baz/b/c.js'
 * }
 */
export async function expandDirectoryPaths(pathMap: PathMap): Promise<PathMap> {
  return await Object.keys(pathMap)
    .map((sourcePath) => ({ sourcePath, stat: stat(sourcePath) }))
    .reduce(async (_acc, { sourcePath, stat }) => {
      const acc = await _acc;
      if ((await stat).isDirectory()) {
        const allDescendants = await findAllPaths(sourcePath);
        const targetPath = pathMap[sourcePath];
        allDescendants.forEach((descendant) => {
          acc[descendant] = path.join(
            targetPath,
            path.relative(sourcePath, descendant)
          );
        });
      } else {
        acc[sourcePath] = pathMap[sourcePath];
      }
      return acc;
    }, Promise.resolve({}));
}
