// @ts-nocheck
/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */

import fs from 'fs';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import pkg from '../../package.json';
import type {Context, ParsedOptions} from '../transform';

const mkdtemp = promisify(fs.mkdtemp);
const writeFile = promisify(fs.writeFile);
const fsStat = promisify(fs.stat);

export function mockDescriptor(
  obj: any,
  propertyName: string,
  descriptor: any
): void {
  let currentDescriptor;
  beforeEach(() => {
    currentDescriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    // $FlowIgnore
    Object.defineProperty(process, propertyName, descriptor);
  });
  afterEach(() => {
    // $FlowIgnore
    Object.defineProperty(process, propertyName, currentDescriptor);
  });
}

export function createFakeContext(
  file?: any,
  options?: ParsedOptions
): Context {
  return {
    j: {},
    file: {path: '', source: '', ...file},
    options: {expandedPaths: {}, ...options},
  };
}

export type FsDefinition = {
  [x: string]: string | Promise<string>;
};

type FsDescriptor = {
  cwd: string;
};

export async function createTemporaryFs(
  definition: FsDefinition
): Promise<FsDescriptor> {
  const tmpFolderPrefix = `${pkg.name.replace(/\W/g, '_')}-`;
  const tmpFolder = await mkdtemp(path.join(os.tmpdir(), tmpFolderPrefix));

  await Promise.all(
    Object.entries(definition).map(async ([_path, content]) => {
      if (path.isAbsolute(_path)) {
        throw new Error(`Paths should be relative, "${_path}" is absolute.`);
      }
      const absolutePath = path.join(tmpFolder, _path);
      if (_path.endsWith('/')) {
        await fse.mkdirp(absolutePath);
      } else {
        await fse.mkdirp(path.dirname(absolutePath));
        const text = await Promise.resolve(content);
        await writeFile(absolutePath, text);
      }
    })
  );

  // TODO: also remove when user exits with ctrl+c and other corner cases
  process.on('exit', () => fse.removeSync(tmpFolder));
  return {
    cwd: tmpFolder,
  };
}

export async function isFile(_path: string): Promise<boolean> {
  try {
    const stat = await fsStat(_path);
    return stat.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
