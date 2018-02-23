<h3 align="center">
  <img align="center" src="assets/mvjs_logo.png" alt="mvjs logo" width="120" />
</h3>

<p align="center">
  Easily move JavaScript modules.
</p>

# mvjs &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/fabiomcosta/mvjs/blob/master/LICENSE) [![npm version](https://badge.fury.io/js/%40fabiomcosta%2Fmvjs.svg)](https://badge.fury.io/js/%40fabiomcosta%2Fmvjs)

Moves JavaScript modules and updates their reference on other modules inside the current project.

## The problem

Moving JavaScript modules inside a project is generaly a tedious task.
After you move it using `mv`, you have to update the `import` and `require` from
the other modules that are referencing the module you just moved.

`mvjs` moves the module and also updates all its references on the other modules
making the task of moving modules much simpler, similarly to using `mv`.

It does this by running a codemod on all JavaScript modules inside the project
(with the help of `jscodeshift`) and smartly updating `import` declarations and
`require` calls.

## Features

* Updates files using all of the new JavaScript features and even [Flow](https://flow.org/)
* Same api and simplicity of the `mv` command
* Shows easy to understand errors when unexpected things happen

## Install

```
npm install -g @fabiomcosta/mvjs
```

This makes `mvjs` available globaly.

## Usage

```text
$ mvjs --help
mvjs - moves a JavaScript module and updates all import references in the
project.

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

Examples:
  mvjs ./a.js ./b.js  Moves "a.js" to "b.js" and updates the other modules
                      importing "a.js" to now import "b.js".
```

## TODO

- [x] Allow moving .jsx, .mjs, .es, .es6
- [x] Allow moving multiple sources to a directory
- [ ] Allow moving a directory to another directory
- [ ] Use git or hg to search for the project files (with fallback to the current method)
- [ ] Use git or hg to move the files
