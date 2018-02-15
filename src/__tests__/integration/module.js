
// dependency or built-in
import('lodash');
require('lodash');
import 'lodash';
import _ from 'lodash';

// absolute paths
import('/src/c.js');
require('/src/c.js');
import '/src/c.js';
import _2 from '/src/c.js';

// es6 imports
import('./a');
require('./a.js');
require(`./a`);
import _3 from './a';
import './a';

// not one of the supported AST nodes
required('nott-require');

// weird constructs
require(`llo ${ y } a \u0000`);
require(x);
require(x + '1');
