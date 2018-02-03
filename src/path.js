// @flow

import path from 'path';
import _glob from 'glob';
import findUp from 'find-up';
import {promisify} from 'util';
import child_process from 'child_process';
import {createDebug, warn} from './log';
import type {Options, Context} from './transform';

const debug = createDebug(__filename);

const glob = promisify(_glob);
const exec = promisify(child_process.exec);

/**
 * Tries to resolve a module path and if it can't find the module we fallback
 * to the passed path.
 * A import path could be pointing to a file that doesn't exist in the file
 * system if the project's code is broken.
 */
function safeResolve(_path: string): string {
  try {
    return require.resolve(_path);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      warn(e.message);
      return _path;
    }
    throw e;
  }
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

  // removing extension in case the referencePath doesn't have one
  const referenceExt = path.extname(referencePath);
  if (!referenceExt) {

    const pathExt = path.extname(_path);
    const pathBasename = path.basename(_path, pathExt);
    const pathDirname = path.dirname(_path);

    // remove the `index` file path, because it's cleaner
    if (pathBasename === 'index') {
      return pathDirname;
    }

    // remove _path extension
    return path.join(pathDirname, pathBasename);
  }

  return _path;
}

export function updateSourcePath(context: Context, importSourcePath: string): string {
  const { j, file, options } = context;

  // not a relative path
  if (!importSourcePath.startsWith('.')) {
    return importSourcePath;
  }

  // absolute paths...
  // They are generaly not used "as-is", but there is a babel plugin that
  // allows absolute paths.
  // https://www.npmjs.com/package/babel-plugin-root-import
  // We are not going to do aything about it.
  if (path.isAbsolute(importSourcePath)) {
    warn(`Ignoring absolute path '${importSourcePath}' at ${file.path}.`);
    return importSourcePath;
  }

  const absoluteImportSourcePath = safeResolve(
    path.join(path.resolve(path.dirname(file.path)), importSourcePath)
  );
  const { sourcePath, targetPath, projectPath } = options;
  const absoluteSourcePath = path.join(projectPath, sourcePath);

  // The importSourcePath is not from the file we are moving, ignore...
  if (absoluteSourcePath !== absoluteImportSourcePath) {
    return importSourcePath;
  }

  // ./src/c.js
  // a.js b/index.js
  // import x from '../a'; -> import x from '../b';
  const targetImportSourcePath = matchPathStyle(
    path.join(path.dirname(importSourcePath), targetPath),
    importSourcePath
  );

  debug(`Updating ${file.path}: ${importSourcePath} -> ${targetImportSourcePath}`);

  return `./${targetImportSourcePath}`;
}

/**
 * Creates a relative path from `_path` to `rootPath`.
 */
export function relativePath(_path: string, rootPath: string): string {
  return path.relative(rootPath, path.resolve(process.cwd(), _path));
}

export async function getNpmBinPath(): Promise<string> {
  const { stdout } = await exec('npm bin');
  return stdout.trim();
}

export async function findProjectPath(): Promise<string> {
  const projectPackageJson = await findUp('package.json');
  if (projectPackageJson == null) {
    // TODO maybe this should be a warning and we could just use process.pwd() as a fallback
    throw new Error(`Could not find a "package.json" file on any parent directory.`);
  }
  return path.dirname(projectPackageJson);
}

// TODO: use git and hg to consider ignored files
// note that the .git and .hg folder would need to match the package.json
// folder for this work properly.
// TODO: support .mjs
export async function findAllJSPaths(): Promise<Array<string>> {
  return (await promisify(glob)('**/*.js')).filter(p => !p.includes('node_modules'));
}

