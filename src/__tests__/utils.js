// @flow

import fs from 'fs';
import os from 'os';
import path from 'path';
import _rimraf from 'rimraf';
import {promisify} from 'util';
import pkg from '../../package.json';
import type {Context} from '../transform';

const mkdtemp = promisify(fs.mkdtemp);
const writeFile = promisify(fs.writeFile);
const rimraf = promisify(_rimraf);

export function mockDescriptor(obj: Object, propertyName: string, descriptor: Object): void {
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

export function createFakeContext(file?: Object, options?: Object): Context {
  return {
    j: {},
    file: { path: '', ...file },
    options: { absoluteSourcePath: '', absoluteTargetPath: '', ...options }
  };
}

type FsDefinition = {
  [string]: string | Promise<string>
};
type FsDescriptor = {
  root: string,
  cleanup: () => Promise<void>
};
export async function createTemporaryFs(definition: FsDefinition): Promise<FsDescriptor> {
  const tmpFolderPrefix = `${pkg.name.replace(/\W/g, '_')}-`;
  const tmpFolder = await mkdtemp(path.join(os.tmpdir(), tmpFolderPrefix));
  for (const [_path, content] of Object.entries(definition)) {
    if (path.isAbsolute(_path)) {
      throw new Error(`Paths should be relative, "${_path}" is absolute.`);
    }
    const absolutePath = path.join(tmpFolder, _path);
    const text = await Promise.resolve(content);
    await writeFile(absolutePath, text);
  }
  return {
    root: tmpFolder,
    async cleanup() {
      await rimraf(tmpFolder);
    }
  };
}
