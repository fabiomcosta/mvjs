// @flow

import {basename, dirname, extname} from 'path';
import {codeFrameColumns} from '@babel/code-frame';
import debug from 'debug';
import pkg from '../package.json';
import type {Debugger} from 'debug';
import type {File} from './transform';

function getPackageNameWithoutNamespace(): string {
  return pkg.name.split('/')[1];
}

function niceName(name: string): string {
  const niceName = basename(name, extname(name));
  if (niceName !== 'index') {
    return niceName;
  }
  return basename(dirname(name));
}

export function createDebug(filename: string): Debugger {
  return debug(`${getPackageNameWithoutNamespace()}:${niceName(filename)}`);
}

type LogOptions = {
  file?: File,
  loc?: {start: {line: number, column: number}, end: {line: number, column: number}}
};

function createFrame({file, loc}: LogOptions = {}): string {
  if (!file) {
    return '';
  }
  const frame = codeFrameColumns(file.source, loc, {highlightCode: true, forceColor: true});
  return `\nat ${file.path}:\n${frame}`;
}

export function log(msg: string, options?: LogOptions): void {
  // eslint-disable-next-line no-console
  console.log(`LOG: ${msg}${createFrame(options)}`);
}

export function warn(msg: string, options?: LogOptions): void {
  // eslint-disable-next-line no-console
  console.warn(`WARN: ${msg}${createFrame(options)}`);
}
