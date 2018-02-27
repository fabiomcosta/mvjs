// @flow

import {promisify} from 'util';
import fs from 'fs';
import {validate, normalize} from './options';
import type {MoveOptions, PathMap} from './options';

const rename = promisify(fs.rename);

export async function move(options: MoveOptions): Promise<void> {
  const pathMap = normalize(await validate(options));
  await movePaths(pathMap);
}

export async function movePaths(pathMap: PathMap): Promise<void> {
  await Promise.all(
    Object.entries(pathMap)
      .map(([sourcePath, targetPath]) => rename(sourcePath, targetPath))
  );
}
