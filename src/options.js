// @flow

import fs from 'fs';
import type {Stats} from 'fs';
import path from 'path';
import {promisify} from 'util';

const fsStat = promisify(fs.stat);

export type MoveOptions = {
  sourcePaths: Array<string>,
  targetPath: string,
};

export type PathMap = {
  [string]: string
};

export const DEFAULT = {
  parser: 'flow',
  recast: {quote: 'single'}
};

export const JS_EXTENSIONS: Set<string> = new Set(
  ['js', 'jsx', 'mjs', 'es', 'es6', 'ts', 'tsx']
);

export const JS_EXTENSIONS_DOTTED: Set<string> = new Set(
  [...Array.from(JS_EXTENSIONS, ext => `.${ext}`)]
);

async function gracefulFsStat(_path: string): Promise<?Stats> {
  try {
    return await fsStat(_path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // if file doesn't exists return null
      return null;
    }
    throw error;
  }
}

async function validateSourcePaths(options: MoveOptions): Promise<void> {
  const {sourcePaths} = options;

  // All sourcePaths should exist and should be files
  await Promise.all(sourcePaths
    .map(sourcePath => ({sourcePath, stat: gracefulFsStat(sourcePath)}))
    .map(async ({sourcePath, stat}) => {
      const sourceStat = await stat;
      if (!sourceStat) {
        throw new Error(
          `Source "${sourcePath}" doesn't exist.`
        );
      }
    }));
}

async function validateTargetPath(options: MoveOptions): Promise<void> {
  const {sourcePaths, targetPath} = options;
  const targetStat = await gracefulFsStat(targetPath);
  if (sourcePaths.length === 1) {
    // The targetPath should not exist
    // NOTE: This diverges from the `mv` command behavior.
    // `mv` would simply overwrite the `targetSource` file or folder, but I
    // find this behavior dangerous. We throw an error instead.
    if (targetStat && !targetStat.isDirectory()) {
      throw new Error(
        `Target "${targetPath}" already exists.`
      );
    }
  } else {
    // For multiple sourcePaths...

    // targetPath needs to exists.
    if (!targetStat) {
      throw new Error(
        `Target "${targetPath}" doesn't exists.`
      );
    }

    // targetPath needs to be a folder.
    if (!targetStat.isDirectory()) {
      throw new Error(
        `Multiple source paths were provided but "${targetPath}" is not a folder.`
      );
    }
  }
}

export async function validate(options: MoveOptions): Promise<MoveOptions> {
  await Promise.all([
    validateSourcePaths(options),
    validateTargetPath(options)
  ]);
  return options;
}

export async function createMovePaths(options: MoveOptions): PathMap {
  const {sourcePaths, targetPath} = options;
  const resolvedTargetPath = path.resolve(targetPath);
  if (sourcePaths.length === 1) {
    const [sourcePath] = sourcePaths;
    const targetStat = await gracefulFsStat(resolvedTargetPath);
    const targetPath = targetStat && targetStat.isDirectory() ? path.join(resolvedTargetPath, path.basename(sourcePath)) : resolvedTargetPath;
    return {
      [path.resolve(sourcePath)]: targetPath
    };
  }
  return sourcePaths.reduce((acc, sourcePath) => {
    const targetPath = path.join(resolvedTargetPath, path.basename(sourcePath));
    acc[path.resolve(sourcePath)] = targetPath;
    return acc;
  }, {});
}
