// @flow

import '@babel/polyfill';
import {updateNodePath, isImportOrRequireNode} from './ast';
import {base64ToObject} from './base64';
import type {NormalizedOptions} from './options';

export const parser = 'flow';

export type File = {
  source: string,
  path: string
};

type Options = {
  movePaths: string
};

type ParsedOptions = {
  movePaths: NormalizedOptions
};

export type Context = {
  options: ParsedOptions,
  j: any,
  file: File
};

function parseOptions({movePaths}: Options): ParsedOptions {
  return {
    movePaths: base64ToObject(movePaths)
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

  return transform.toSource({quote: 'single'});
}
