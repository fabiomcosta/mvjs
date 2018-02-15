#!/usr/bin/env node

// @flow

import yargs from 'yargs';
import {executeTransform} from './runner';

const { argv } = yargs
  .demandCommand(2)
  .help();

(async () => {

  const allNonOptionlArgs = argv._.slice();
  const targetPath = allNonOptionlArgs.pop()
  const sourcePaths = allNonOptionlArgs;

  await executeTransform({
    sourcePaths,
    targetPath
  });

})();
