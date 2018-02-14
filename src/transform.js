// @flow

import '@babel/polyfill';
import path from 'path';
import {createDebug, warn} from './log';
import {matchPathStyle} from './path';
import {updateNodePath, isImportOrRequireNode} from './ast';

const debug = createDebug(__filename);

export const parser = 'flow';

export type Options = {
  sourcePath: string,
  targetPath: string,
  projectPath: string
};

export type Context = {
  options: Options,
  j: any,
  file: any
};

export default function transformer(file: any, api: any, options: Options) {
  const j = api.jscodeshift;
  const context = { options, j, file };
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

  return transform.toSource({ quote: 'single' });
}
