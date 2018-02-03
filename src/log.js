// @flow

import debug from 'debug';
import {basename, extname} from 'path';
import type { Debugger } from 'debug';
import pkg from '../package.json';

function getPackageNameWithoutNamespace(): string {
  return pkg.name.split('/')[1];
}

function niceName(name: string): string {
  return basename(name, extname(name));
}

export function createDebug(filename: string): Debugger {
  return debug(`${getPackageNameWithoutNamespace()}:${niceName(filename)}`);
}

export function log(msg: string): void {
  console.log(`LOG: ${msg}`);
}

export function warn(msg: string): void {
  console.warn(`WARN: ${msg}`);
}
