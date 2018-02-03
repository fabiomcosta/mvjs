// @flow

import {warn} from './log';
import {updateSourcePath} from './path';
import type {Context} from './transform';
import type {Node, TemplateLiteral, Literal, Identifier, CallExpression} from 'ast-types-flow';

function updateTemplateLiteralPath(context: Context, templateLiteral: TemplateLiteral): ?TemplateLiteral {
  const { j } = context;
  if (templateLiteral.expressions.length || templateLiteral.quasis.length > 1) {
    return warn(
      `Cannot transform TemplateLiteral (print template) to Literal because it contains expressions.`
    );
  }
  const literalValue = updateSourcePath(context, templateLiteral.quasis[0].value.cooked);
  return j.templateLiteral(
    // TODO raw value is different, look at AST specs
    [j.templateElement({ cooked: literalValue, raw: literalValue }, true)],
    []
  );
}

function updateLiteralPath(context: Context, literal: Literal): Literal {
  const { j } = context;
  if (typeof literal.value !== 'string') {
    throw new Error('');
  }
  return j.literal(updateSourcePath(context, literal.value));
}

export function updateNodePath(context: Context, originalSourcePathNode: Node): ?Node {
  const { j } = context;
  switch (originalSourcePathNode.type) {
    case 'Literal':
      return updateLiteralPath(context, originalSourcePathNode);
    case 'TemplateLiteral':
      return updateTemplateLiteralPath(context, originalSourcePathNode);
  }
  return warn(
    `Cannot transform anything other than Literals or TemplateLiterals. ` +
    `Found ${originalSourcePathNode.type} at (print code)`
  );
}

function isProbablyGlobalIdentifier(identifier: Identifier): boolean {
  // TODO provide a warning when this doesn't match
  return (/^self|global$/).test(identifier.name);
}

export function isImportOrRequireNode(j: any, { callee }: CallExpression): boolean {
  switch (callee.type) {
    // $FlowFixMe the 'Import' is not yet supported by ast-types-flow
    case 'Import':
    // import('...')
      return true;
    case 'Identifier':
    // require('...')
      return callee.name === 'require';
    case 'MemberExpression':
    // global.require('...') or self.require('...')
      const { object, property } = callee;
      if (object.type !== 'Identifier' || property.type !== 'Identifier') {
        // There is a very high chance this is not a require call, let's not
        // even warn or debug about it to avoid confusion.
        return false;
      }
      return property.name === 'require' && isProbablyGlobalIdentifier(object);
  }
  return false;
}
