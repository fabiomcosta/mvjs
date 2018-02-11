// @flow

import path from 'path';
import type {Context} from './transform';

/**
 * Tries to resolve a module path and if it can't find the module we throw
 * a nice to understand error.
 */
export default function requireResolve(context: Context, _path: string): string {
  try {
    return require.resolve(_path);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `File "${context.file.path}" is importing "${_path}" but it does not exists.`
      );
    }
    throw e;
  }
};
