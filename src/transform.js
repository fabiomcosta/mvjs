// @flow

import '@babel/polyfill';
import memoize from 'fast-memoize';
import {updateNodePath, isImportOrRequireNode} from './ast';
import {base64ToObject} from './base64';
import type {NormalizedOptions} from './options';

export type File = {
  source: string,
  path: string
};

type Options = {
  movePaths: string,
  recastOptions: string
};

type ParsedOptions = {
  movePaths: NormalizedOptions,
  recastOptions: Object
};

export type Context = {
  options: ParsedOptions,
  j: any,
  file: File
};

// base64ToObject is used once for each transformed file, so caching it gives
// us a nice perf win.
const memoizedBase64ToObject = memoize((base64String: string): Object => {
  return base64ToObject(base64String);
});

function parseOptions({movePaths, recastOptions}: Options): ParsedOptions {
  return {
    movePaths: memoizedBase64ToObject(movePaths),
    recastOptions: memoizedBase64ToObject(recastOptions)
  };
}

export default function transformer(file: any, api: any, options: Options) {
  const j = api.jscodeshift;
  const context = {j, file, options: parseOptions(options)};
  const transform = j(file.source);

  transform
    .find(j.ImportDeclaration)
    .forEach(path => {
      const importSourcePath = updateNodePath(context, path.value.source);
      if (importSourcePath == null) {
        return;
      }
      const importDeclaration = {
        ...path.value,
        source: importSourcePath
      };
      j(path).replaceWith(importDeclaration);
    });

  transform
    .find(j.CallExpression)
    .filter(p => isImportOrRequireNode(j, p.value))
    .forEach(path => {
      const importSourcePath = updateNodePath(context, path.value.arguments[0]);
      if (importSourcePath == null) {
        return;
      }
      const importDeclaration = {
        ...path.value,
        arguments: [importSourcePath]
      };
      j(path).replaceWith(importDeclaration);
    });

  return transform.toSource(context.options.recastOptions);
}
