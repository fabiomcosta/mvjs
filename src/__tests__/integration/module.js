/* eslint-disable */

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
import('./b');
require('./b.js');
require(`./b`);
import _3 from './b';
import './b';

// not one of the supported AST nodes
required('nott-require');

// weird constructs
require(`llo ${ y } a \u0000`);
require(x);
require(x + '1');
