// @flow

import { basename, dirname, extname } from 'path';
import { codeFrameColumns } from '@babel/code-frame';
import debug from 'debug';
import * as chalk from 'chalk';
import pkg from '../package.json';
import type { Debugger } from 'debug';
import type { File } from './transform';

// Forces colors. Ideally I'd figure out a way to make colors work when
// using execFile.
const c = new chalk.Instance({
  enabled: true,
  level: 3,
});

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
  loc?: {
    start: { line: number, column: number },
    end: { line: number, column: number },
  },
};

function createFrame({ file, loc }: LogOptions = {}): string {
  if (!file) {
    return '';
  }
  // The column location seems off by one, fixing that.
  if (loc) {
    loc.start.column++;
    loc.end.column++;
  }
  const frame = codeFrameColumns(file.source, loc, {
    highlightCode: true,
    forceColor: true,
  });
  return `\nat ${file.path}:\n${frame}`;
}

export function info(msg: string, options?: LogOptions): void {
  // eslint-disable-next-line no-console
  console.info(`${c.cyan('INFO:')} ${msg}${createFrame(options)}`);
}

export function warn(msg: string, options?: LogOptions): void {
  // eslint-disable-next-line no-console
  console.warn(`${c.yellow('WARN:')} ${msg}${createFrame(options)}`);
}
