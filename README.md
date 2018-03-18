<h3 align="center">
  <img align="center" src="assets/mvjs_logo.png" alt="mvjs logo" width="120" />
</h3>

<p align="center">
  Easily move JavaScript modules.
</p>

# mvjs &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/fabiomcosta/mvjs/blob/master/LICENSE) [![npm version](https://badge.fury.io/js/%40fabiomcosta%2Fmvjs.svg)](https://badge.fury.io/js/%40fabiomcosta%2Fmvjs)

Moves JavaScript modules and updates their reference on other modules inside the current project.

## The problem

Moving JavaScript modules inside a project is generally a tedious task.
After you move it using `mv`, you have to update the `import` and `require` from
the other modules that are referencing the module you just moved.

`mvjs` moves the module and also updates all its references on the other modules
making the task of moving modules much simpler, similarly to using `mv`.

It does this by running a codemod on all JavaScript modules inside the project
(with the help of `jscodeshift`) and smartly updating `import` declarations and
`require` calls.

## Features

* Supports and updates `import _ from '...'`, `import('...')` and `require('...')`
* Updates files using all of the new JavaScript features and even [Flow](https://flow.org/)
* Same api and simplicity of the `mv` command
* Shows easy to understand errors when unexpected things happen

## Install

```
npm install -g @fabiomcosta/mvjs
```

This makes `mvjs` available globally.

## CLI Usage

```text
$ mvjs --help
mvjs - moves a JavaScript module and updates all import references in the project.

Options:
  --version  Show version number                                                                               [boolean]
  --parser   jscodeshift's parser option.
             See https://github.com/facebook/jscodeshift#parser                                        [default: "flow"]
  --help     Show help                                                                                         [boolean]

Examples:
  mvjs ./a.js ./b.js                          Moves "a.js" to "b.js" and updates the other modules importing "a.js" to
                                              now import "b.js".
  mvjs --recast.quote='double' ./a.js ./b.js  Recast options can be changed by using --recast.optionName notation.
                                              In this example the codemoded files are going to have double quotes for
                                              all strings.
                                              See https://github.com/benjamn/recast/blob/master/lib/options.js
```

## API Usage

move (and ONLY move) modules:

```js
import {move} from '@fabiomcosta/mvjs';

(async () => {
  await move({
    sourcePaths: ['./foo.js', './bar.mjs'],
    targePath: './baz'
  });
})();
```

codemod the import statements from the current project modules:

```js
import {transform} from '@fabiomcosta/mvjs';

(async () => {
  await transform({
    sourcePaths: ['./foo.js', './bar.mjs'],
    targePath: './baz',
    parser: 'flow', // optional
    recastOptions: {quotes: 'single'} // optional
  });
})();
```

## TODO

- [x] move .jsx, .mjs, .es, .es6
- [x] move multiple sources to a directory
- [x] move a directory to another directory
- [ ] move *any* file extension (keep updating the references only on from .js, .jsx, .mjs, .es, .es6 files)
- [ ] Use git or hg to search for the project files (with fallback to the current method)
- [ ] Use git or hg to move the files
- [ ] Update references on other types of files, like CSS, SASS, LESS etc.
