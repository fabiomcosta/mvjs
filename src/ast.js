// @flow

import {warn} from './log';
import {updateSourcePath} from './path';
import type {Context} from './transform';
import type {Node, TemplateLiteral, Literal, CallExpression} from 'ast-types-flow';

function updateTemplateLiteralPath(context: Context, templateLiteral: TemplateLiteral): ?TemplateLiteral {
  const {j, file} = context;
  if (templateLiteral.expressions.length || templateLiteral.quasis.length > 1) {
    return warn(
      `Cannot transform TemplateLiteral to Literal because it contains expressions.\n` +
      `You might want to update this manually depending on if the files you are moving `+
      `are also related to this require/import.`,
      {file, loc: templateLiteral.loc}
    );
  }
  const literalValue = updateSourcePath(context, templateLiteral.quasis[0].value.cooked);
  return j.templateLiteral(
    // TODO raw value is different, look at AST specs
    [j.templateElement({cooked: literalValue, raw: literalValue}, true)],
    []
  );
}

function updateLiteralPath(context: Context, literal: Literal): Literal {
  const {j} = context;
  if (typeof literal.value !== 'string') {
    throw new Error(
      `Cannot transform Literal because its value is not a string.\n` +
      `Found ${String(JSON.stringify(literal.value))} of type "${typeof literal.value}".`
    );
  }
  return j.literal(updateSourcePath(context, literal.value));
}

export function updateNodePath(context: Context, originalSourcePathNode: Node): ?Node {
  const {file} = context;
  switch (originalSourcePathNode.type) {
    case 'Literal':
      return updateLiteralPath(context, originalSourcePathNode);
    case 'TemplateLiteral':
      return updateTemplateLiteralPath(context, originalSourcePathNode);
  }
  return warn(
    `Cannot transform anything other than Literals or TemplateLiterals.\n` +
    `You might want to update this manually depending on if the files you are moving `+
    `are also related to this require/import.`,
    {file, loc: originalSourcePathNode.loc}
  );
}

export function isImportOrRequireNode(j: any, {callee}: CallExpression): boolean {
  switch (callee.type) {
    // $FlowFixMe the 'Import' is not yet supported by ast-types-flow
    case 'Import':
    // import('...')
      return true;
    case 'Identifier':
    // require('...') or proxyquire('...')
      return callee.name === 'require' || callee.name === 'proxyquire';
  }
  return false;
}
