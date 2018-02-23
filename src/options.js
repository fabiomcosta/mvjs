// @flow

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';

const fsStat = promisify(fs.stat);

export type Options = {
  sourcePaths: Array<string>,
  targetPath: string
};

export type NormalizedOptions = {
  [string]: string
};

export const SUPPORTED_EXTENSIONS: Set<string> = new Set(
  ['js', 'jsx', 'mjs', 'es', 'es6']
);
export const SUPPORTED_EXTENSIONS_DOTTED: Set<string> = new Set(
  [...Array.from(SUPPORTED_EXTENSIONS, ext => `.${ext}`)]
);

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

async function validateSourcePaths(options: Options): Promise<void> {
  const {sourcePaths} = options;

  // All sourcePaths should exist and should be files
  await sourcePaths
    .map(_path => ({_path, stat: fsStat(_path)}))
    .map(async ({_path, stat}) => {
      const s = await stat;
      if (!s.isFile()) {
        // TODO Allow moving folders
        throw new Error(
          `Only files can be moved, and "${_path}" is not a file.\n` +
          `There are plans to allow moving folders.`
        );
      }
    });

  sourcePaths
    .map(_path => ({_path, ext: path.extname(_path)}))
    .forEach(({_path, ext}) => {
      if (!SUPPORTED_EXTENSIONS_DOTTED.has(ext)) {
        throw new Error(
          `Can't move "${_path}". Supported extensions: ` +
          `${Array.from(SUPPORTED_EXTENSIONS).join(', ')}.`
        );
      }
    });
}

async function validateTargetPath(options: Options): Promise<void> {
  const {sourcePaths, targetPath} = options;
  if (sourcePaths.length === 1) {
    // The targetPath should not exist
    const targetExists = await fsExists(targetPath);
    if (targetExists) {
      throw new Error(
        `Target "${targetPath}" already exists.`
      );
    }

    const targetExt = path.extname(targetPath);
    if (!SUPPORTED_EXTENSIONS_DOTTED.has(targetExt)) {
      throw new Error(
        `Can't move to "${targetPath}". Supported extensions: ` +
        `${Array.from(SUPPORTED_EXTENSIONS).join(', ')}.`
      );
    }
  } else {
    // For multiple sourcePaths, targetPath needs to be a folder.
    const targetStat = await fsStat(targetPath);
    if (!targetStat.isDirectory()) {
      throw new Error(
        `Multiple source paths were provided but "${targetPath}" is not a folder.`
      );
    }
  }
}

export async function validate(options: Options): Promise<Options> {
  await Promise.all([
    validateSourcePaths(options),
    validateTargetPath(options)
  ]);
  return options;
}

export function normalize(options: Options): NormalizedOptions {
  const {sourcePaths, targetPath} = options;
  const resolvedTargetPath = path.resolve(targetPath);
  if (sourcePaths.length === 1) {
    return {
      [path.resolve(sourcePaths[0])]: resolvedTargetPath
    };
  }
  return sourcePaths.reduce((acc, sourcePath) => {
    acc[path.resolve(sourcePath)] = path.join(resolvedTargetPath, path.basename(sourcePath))
    return acc;
  }, {});
}
