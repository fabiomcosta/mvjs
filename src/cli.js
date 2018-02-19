#!/usr/bin/env node

// @flow

import yargs from 'yargs';
import {executeTransform} from './runner';

const {argv} = yargs
  .usage(`$0 - moves a JavaScript module and updates all import references in the project.`)
  .example(
    `$0 ./a.js ./b.js`,
    `Moves "a.js" to "b.js" and updates the other modules importing "a.js" to now import "b.js".`
  )
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
