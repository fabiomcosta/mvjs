import type {
  FileInfo,
  API,
  JSCodeshift,
  ASTPath,
  ImportDeclaration,
} from 'jscodeshift';
import {updateNodePath, isImportOrRequireNode} from './ast';
import type {PathMap} from './options';

export type File = {
  source: string;
  path: string;
};

export type ParsedOptions = {
  expandedPaths: PathMap;
  recastOptions?: { [k: string]: string };
};

export type Context = {
  options: ParsedOptions;
  j: JSCodeshift;
  file: File;
};

type Options = {
  options: ParsedOptions;
};

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
): unknown {
  const j = api.jscodeshift;
  const context = {j, file, options: options.options};
  const transform = j(file.source);

  function applyUpdateNode(path: ASTPath<ImportDeclaration>) {
    const importSourcePath = updateNodePath(context, path.value.source);
    if (importSourcePath == null) {
      return;
    }
    // Keeping comments
    // $FlowFixMe sounds like the comments field is new to Nodes and the Flow type is outdated
    importSourcePath.comments = path.value.source.comments;
    const importDeclaration = {
      ...path.value,
      source: importSourcePath,
    };
    j(path).replaceWith(importDeclaration);
  }

  transform
    .find<ImportDeclaration>(j.ImportDeclaration)
    .forEach((p) => applyUpdateNode(p));
  transform
    .find<ImportDeclaration>(j.ImportExpression)
    .forEach((p) => applyUpdateNode(p));

  transform
    .find(j.CallExpression)
    .filter((p) => isImportOrRequireNode(p.value))
    .forEach((path) => {
      const [source, ...otherArguments] = path.value.arguments;
      const importSourcePath = updateNodePath(context, source);
      if (importSourcePath == null) {
        return;
      }
      // Keeping comments
      // $FlowFixMe sounds like the comments field is new to Nodes and the Flow type is outdated
      importSourcePath.comments = source.comments;
      const importDeclaration = {
        ...path.value,
        arguments: [importSourcePath, ...otherArguments],
      };
      j(path).replaceWith(importDeclaration);
    });

  return transform.toSource(context.options.recastOptions);
}
