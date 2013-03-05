var program = require('commander')
  , Builder = require('component-builder')
  , utils = require('./lib/utils.js')
  , log = utils.log
  , path = require('path')
  , fs = require('fs')
  , mkdir = require('mkdirp');

// options

program
  .option('-d, --dev', 'build development dependencies')
  .option('-s, --standalone <name>', 'build a stand-alone version of the component')
  .option('-o, --out <dir>', 'output directory defaulting to ./build', 'build')
  .option('-n, --name <file>', 'base name for build files defaulting to build', 'build')
  .option('-v, --verbose', 'output verbose build information')
  .option('-p, --prefix <str>', 'prefix css asset urls with <str>')
  .option('-c, --copy', 'copy files instead of linking')
  .option('-a, --append', 'append a call to entry')
  .option('-t, --testOnly', 'only testable version of module');

// examples

program.on('--help', function(){
  console.log('  Examples:');
  console.log();
  console.log('    # build to ./build');
  console.log('    $ component build');
  console.log();
  console.log('    # build to ./dist as assets.js, assets.css');
  console.log('    $ component build -o dist -n assets');
  console.log();
  console.log('    # build standalone as window.$');
  console.log('    $ component build --standalone $');
  console.log();
});

// parse argv

program.parse(process.argv);

// load json

var conf = require(path.resolve( 'component.json' ));

// standalone

var standalone = program.standalone;

// output paths

var jsPath = path.resolve(path.join(program.out, program.name + '.js'));
var debugPath = path.resolve(path.join(program.out, program.name + '.debug.js'));
var cssPath = path.join(program.out, program.name + '.css');

// mkdir -p

mkdir.sync(program.out);

// build

var builder = new Builder( process.cwd() );
if (program.copy) builder.copyFiles();
builder.copyAssetsTo(program.out);
if (program.dev) builder.prefixUrls('./');
if (program.prefix) builder.prefixUrls(program.prefix);

// lookup paths

if (conf.paths) builder.addLookup(conf.paths);

var start = new Date;

// --dev

if (program.dev) {
  builder.development();
  builder.addSourceURLs();
}

// build

if (program.verbose) console.log();
builder.build(function(err, obj){
  if (err) utils.fatal(err.message);
  var js = '';
  var debug = '';
  var css = obj.css.trim();

  js += '(function(){\n';
  js += obj.require;
  debug += obj.require;

  js += obj.js;
  debug += obj.js;

  if(program.append){

    conf.scripts.forEach(function(name){

      debug += "\nrequire('" + conf.name + "/" + name + "')\n"
      js += "\nrequire('" + conf.name + "/" + name + "')\n"

    })

  }

  js += '\n})();';
  // css
  if (css) fs.writeFile(cssPath, css);
  // js
  if(!program.testOnly){
    log(" writing ", jsPath);
    fs.writeFile(jsPath, js);
  }
  log(" writing ", debugPath);
  fs.writeFile(debugPath, debug);

  if (!program.verbose) return;
  var duration = new Date - start;
  log('write', jsPath);
  log('write', cssPath);
  log('js', (js.length / 1024 | 0) + 'kb');
  if (css) log('css', (css.length / 1024 | 0) + 'kb');
  log('duration', duration + 'ms');
  console.log();
});