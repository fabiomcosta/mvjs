// @flow

import path from 'path';
import fs from 'fs';
import findUp from 'find-up';
import {promisify} from 'util';
import requireResolve from './requireResolve';
import {createDebug, warn} from './log';
import {SUPPORTED_EXTENSIONS_DOTTED, type PathMap} from './options';
import type {Context} from './transform';

const debug = createDebug(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

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
 */
export function matchPathStyle(_path: string, referencePath: string): string {

  const referenceExt = path.extname(referencePath);
  // referencePath has an extension, let's keep it
  if (referenceExt) {
    return _path;
  }

  // remove extension in case the referencePath doesn't have one
  const pathExt = path.extname(_path);
  const pathBasename = path.basename(_path, pathExt);
  const pathDirname = path.dirname(_path);

  return path.join(pathDirname, pathBasename);
}

/**
 * Returns the absolute path that represents the path from the source file if
 * the current `file.path` was importing the source.
 * With this value we can check if the relative importSourcePath matches the
 * provided `sourcePath`.
 */
function getAbsoluteImportSourcePath(context: Context, importSourcePath: string): string {
  const {file} = context;
  return requireResolve(
    context,
    path.resolve(path.dirname(file.path), importSourcePath)
  );
}

// Returns a relative path from `sourcePath` to `targetPath`, using `referencePath` as a "style" or "format" reference.
// Ex:
// sourcePath: './folder/a.js'
// targetPath: './b.js'
// referencePath: './folder/a'
// -> '../b'
function generateRelativeNormalizedPath(sourcePath: string, targetPath: string, referencePath: string): string {
  return  normalizePath(
    matchPathStyle(
      path.relative(path.dirname(sourcePath), targetPath),
      referencePath
    )
  );
}

function generateSourcePathForExternalModule(
  context: Context,
  targetPath: string,
  importSourcePath: string
): string {

  const {file} = context;

  // On file `./src/c.js`
  // When moving `a.js` to `b.js`
  // import x from '../a'; -> import x from '../b;
  const targetImportSourcePath = generateRelativeNormalizedPath(file.path, targetPath, importSourcePath);

  debug(`Updating ${file.path}: ${importSourcePath} -> ${targetImportSourcePath}`);

  return targetImportSourcePath;
}

function generateSourcePathForMovedModule(
  context: Context,
  targetPath: string,
  importSourcePath: string,
  absoluteImportPath: string
): string {

  const {file} = context;

  // On file `./c.js`
  // When moving `./c.js` to `./src/c.js`
  // import x from './a'; -> import x from '../a';
  const targetImportSourcePath = generateRelativeNormalizedPath(targetPath, absoluteImportPath, importSourcePath);

  debug(`Updating ${file.path}: ${importSourcePath} -> ${targetImportSourcePath}`);

  return targetImportSourcePath;
}

export function updateSourcePath(context: Context, importSourcePath: string): string {

  const {file} = context;

  // absolute paths...
  // They are generaly not used "as-is", but there is a babel plugin that
  // allows absolute paths.
  // https://www.npmjs.com/package/babel-plugin-root-import
  // We are not going to do aything about it.
  if (path.isAbsolute(importSourcePath)) {
    debug(`Ignoring absolute path "${importSourcePath}" from "${file.path}".`);
    return importSourcePath;
  }

  // Not an absolute path and not a relative path, it's either a built-in
  // module or a dependency, ignore it.
  if (!importSourcePath.startsWith('.')) {
    return importSourcePath;
  }

  // Has an unsupported extension, ignore.
  const importSourcePathExt = path.extname(importSourcePath);
  if (importSourcePathExt && !SUPPORTED_EXTENSIONS_DOTTED.has(importSourcePathExt)) {
    return importSourcePath;
  }

  const {options} = context;

  for (const sourcePath in options.expandedPaths) {
    const targetPath = options.expandedPaths[sourcePath];
    const absoluteImportSourcePath = getAbsoluteImportSourcePath(context, importSourcePath);

    // `sourcePath` matches the file being transformed, update path accordingly
    if (sourcePath === file.path) {
      const absoluteImportPath = options.expandedPaths[absoluteImportSourcePath] || absoluteImportSourcePath;
      return generateSourcePathForMovedModule(context, targetPath, importSourcePath, absoluteImportPath);
    }

    // `importSourcePath` matches the `sourcePath`
    if (sourcePath === absoluteImportSourcePath) {
      return generateSourcePathForExternalModule(context, targetPath, importSourcePath);
    }
  }

  return importSourcePath;
}

export async function findProjectPath(): Promise<string> {
  const projectPackageJson = await findUp('package.json');
  if (projectPackageJson == null) {
    const cwd = process.cwd();
    warn(`Could not find a "package.json" file on any parent directory, using "${cwd}" as a fallback.`);
    return cwd;
  }
  return path.dirname(projectPackageJson);
}

const IGNORED_FOLDERS = new Set(['node_modules', '.git', '.hg']);

// TODO: use `git ls-files` and `hg manifest` to consider ignored files.
// Note that the .git and .hg folder would need to match the package.json
// folder for this to work properly.
export async function findAllJSPaths(rootPath: string): Promise<Array<string>> {
  const subFiles = await readdir(rootPath);
  const files = await Promise.all(subFiles.map(async (subFile) => {
    const res = path.join(rootPath, subFile);
    if ((await stat(res)).isDirectory()) {
      if (IGNORED_FOLDERS.has(subFile)) {
        return null;
      }
      return findAllJSPaths(res);
    } else if (!SUPPORTED_EXTENSIONS_DOTTED.has(path.extname(subFile))) {
      return null;
    }
    return res;
  }));
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
    .map(sourcePath => ({sourcePath, stat: stat(sourcePath)}))
    .reduce(async (_acc, {sourcePath, stat}) => {
      const acc = await _acc;
      if ((await stat).isDirectory()) {
        const allDescendants = await findAllJSPaths(sourcePath);
        const targetPath = pathMap[sourcePath];
        allDescendants.forEach(descendant => {
          acc[descendant] = path.join(targetPath, path.relative(sourcePath, descendant));
        });
      } else {
        acc[sourcePath] = pathMap[sourcePath];
      }
      return acc;
    }, Promise.resolve({}));
}
