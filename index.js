'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/js-seq.cjs.production.js')
} else {
  module.exports = require('./dist/js-seq.cjs.development.js')
}
