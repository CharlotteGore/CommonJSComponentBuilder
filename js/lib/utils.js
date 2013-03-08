var fs = require('fs');
var path = require('path');

exports.fatal = function(){
  console.error();
  exports.error.apply(null, arguments);
  console.error();
  process.exit(1);
};

/**
 * Log the given `type` with `msg`.
 *
 * @param {String} type
 * @param {String} msg
 * @api public
 */

exports.log = function(type, msg, color){
  color = color || '36';
  var w = 10;
  var len = Math.max(0, w - type.length);
  var pad = Array(len + 1).join(' ');
  console.log('  \033[' + color + 'm%s\033[m : \033[90m%s\033[m', pad + type, msg);
};

/**
 * Log warning message with `type` and `msg`.
 *
 * @param {String} type
 * @param {String} msg
 * @api public
 */

exports.warn = function(type, msg){
  exports.log(type, msg, '33');
};

/**
 * Output error message.
 *
 * @param {String} msg
 * @api private
 */

exports.error = function(msg){
  var w = 10;
  var type = 'error';
  var len = Math.max(0, w - type.length);
  var pad = Array(len + 1).join(' ');
  console.error('  \033[31m%s\033[m : \033[90m%s\033[m', pad + type, msg);
};

var rmdir;

exports.rmdir = rmdir = function(dir) {
  var list = fs.readdirSync(dir);
  for(var i = 0; i < list.length; i++) {
    var filename = path.join(dir, list[i]);
    var stat = fs.statSync(filename);
    
    if(filename == "." || filename == "..") {
      // pass these files
    } else if(stat.isDirectory()) {
      // rmdir recursively
      rmdir(filename);
    } else {
      // rm fiilename
      fs.unlinkSync(filename);
    }
  }
  fs.rmdirSync(dir);
};