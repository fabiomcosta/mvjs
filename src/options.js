// @flow

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';

const fsStat = promisify(fs.stat);

export type Options = {
  sourcePaths: Array<string>,
  targetPath: string
};

type NormalizedOptions = {
  absoluteSourcePaths: Array<string>,
  absoluteTargetPath: string
};

const SUPPORTED_EXTENSIONS = new Set(['.js']);

async function fsExists(_path: string): Promise<boolean> {
  try {
    await fsStat(_path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
  return true;
}

async function validatePaths(options: Options): Promise<Options> {
  const { sourcePaths, targetPath } = options;

  if (sourcePaths.length > 1) {
    // TODO Support multitple sourcePaths
    // TODO when allowing multiple sourcePaths, remember that for multiple sourcePaths,
    // targetPath has to be a folder
    throw new Error(
      `Only one "sourcePath" is supported, but multiple were provided: ` +
      `${sourcePaths.join(', ')}.\nThere are plans to add this functionality.`
    );
  }

  // All sourcePaths should exist and should be files
  await sourcePaths
    .map(_path => ({ _path, stat: fsStat(_path) }))
    .map(async ({ _path, stat }) => {
      const s = await stat;
      if (!s.isFile()) {
        // TODO Allow moving folders
        throw new Error(
          `Only files can be moved, and "${_path}" is not a file.\n` +
          `There are plans to allow moving folders.`
        );
      }
    });

  // The targetPath should not exist
  const targetStat = await fsExists(targetPath);
  if (targetStat) {
    throw new Error(
      `Target "${targetPath}" already exists.`
    );
  }

  // TODO: support .mjs
  // TODO: support .jsx
  sourcePaths
    .map(_path => ({ _path, ext: path.extname(_path) }))
    .forEach(({ _path, ext }) => {
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        throw new Error(
          `Can't move "${_path}". Supported extensions: ` +
          `${Array.from(SUPPORTED_EXTENSIONS).join(', ')}.`
        );
      }
    });

  const targetExt = path.extname(targetPath);
  if (!SUPPORTED_EXTENSIONS.has(targetExt)) {
    throw new Error(
      `Can't move to "${targetPath}". Supported extensions: ` +
      `${Array.from(SUPPORTED_EXTENSIONS).join(', ')}.`
    );
  }

  return options;
}

// TODO CHECK if SOURCE exists
// TODO CHECK if TARGET already exists
// TODO MOVE FILE sourcePath -> targetPath

export async function validate(options: Options): Promise<Options> {
  return await validatePaths(options);
}

export function normalize({sourcePaths, targetPath}: Options): NormalizedOptions {
  return {
    absoluteSourcePaths: sourcePaths.map(p => path.resolve(p)),
    absoluteTargetPath: path.resolve(targetPath)
  };
}
