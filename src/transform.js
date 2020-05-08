// @flow

import {updateNodePath, isImportOrRequireNode} from './ast';
import type {PathMap} from './options';

export type File = {
  source: string,
  path: string
};

export type ParsedOptions = {
  expandedPaths: PathMap,
  recastOptions?: Object
};

export type Context = {
  options: ParsedOptions,
  j: any,
  file: File
};

type Options = {
  options: ParsedOptions,
};

export default function transformer(file: any, api: any, options: Options) {
  const j = api.jscodeshift;
  const context = {j, file, options: options.options};
  const transform = j(file.source);

  function applyUpdateNode(path) {
    const importSourcePath = updateNodePath(context, path.value.source);
    if (importSourcePath == null) {
      return;
    }
    const importDeclaration = {
      ...path.value,
      source: importSourcePath
    };
    j(path).replaceWith(importDeclaration);
  }

  transform
    .find(j.ImportDeclaration)
    .forEach(applyUpdateNode);

  transform
    .find(j.ImportExpression)
    .forEach(applyUpdateNode);

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
