# mvjs

Moves JavaScript modules and updates their reference on other modules inside the current project.

## The problem

Moving JavaScript modules inside a project is generaly a tedious task.
After you move it using `mv`, you have to update the `import` and `require` from
the other modules that are referencing the module we just moved.

`mvjs` moves the module and also updates all its references on the other modules
making the task of module much simpler.

It does this by running a codemod on all JavaScript modules inside the project
(with the help of `jscodeshift`) and smartly updating `import` declarations and
`require` calls.

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

[ ] - Allow moving .jsx
[ ] - Allow moving .mjs
[ ] - Allow moving a directory to another directory
[ ] - Allow moving multiple sources to a directory
[ ] - Use git or hg to search for the project files (with fallback to the current method)
