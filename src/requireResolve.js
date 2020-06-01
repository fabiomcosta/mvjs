// @flow

import resolve from 'enhanced-resolve';
import type { Context } from './transform';
import { warn } from './log';
import { JS_EXTENSIONS_DOTTED } from './options';

const enhancedResolve = resolve.create.sync({
  symlinks: false,
  extensions: Array.from(JS_EXTENSIONS_DOTTED),
});

/**
 * Tries to resolve a module path and if it can't find the module we throw
 * a nice to understand error.
 */
export default function requireResolve(
  context: Context,
  _path: string
): string {
  try {
    return enhancedResolve(context.file.path, _path);
  } catch (e) {
    // If known enhanced-resolve error
    if (e.details && e.missing) {
      warn(
        `File "${context.file.path}" is importing "${_path}" but it does not exist.`
      );
      return _path;
    }
    throw e;
  }
}
