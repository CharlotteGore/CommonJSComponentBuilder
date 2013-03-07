var program = require('commander');
var path = require('path');
var fs = require('fs');
var log = require('./lib/utils').log;
var error = require('./lib/utils').error;
var spawn = require('child_process').spawn;

program
	.version('0.0.1')
	.option('-e, --entry [file]', 'Entry point')
	.option('-o, --output [file]', 'Output dir', '/build')
	.option('-n, --name [name]', 'Base name for output file', 'build')
	.option('-f, --force', 'Force rebuild and install of dependencies')
	.parse(process.argv);

var isEmptyObject = function(obj) {
  return !Object.keys(obj).length;
}

// fire off the build process...

var dir = path.resolve(program.entry);

try{

	var conf = require( path.join(dir, 'component.json') );


}catch(e){

	throw new Error("component.json not found in build target!");

}

var mainBuild = function(){

	//log('build target', path.resolve(program.output));


	//log("build process", process.execPath + " " + path.resolve(__dirname + '/component-build') + ' -i ' +  dir + ' -o ' + path.resolve(program.output) + ' -n ' + program.name + ' -a ');
	//log("install cwd", process.cwd())

	var build = spawn(process.execPath, [path.resolve(__dirname + '/component-build'),'-o', path.resolve(program.output), '-n', program.name, '-a'], { cwd : dir });

	build.stdout.on('data', function( data ){

		console.log(''+data);

	})

	build.stderr.on('data', function( data){
		console.log(''+data);

	})
	build.on('exit', function(){

		log( ' validating', path.join(program.output, program.name + ".js") )

		fs.stat( path.join(program.output, program.name + ".js"), function(err){

			if(err){

				error(' failed', program.name + ".js not built");
				console.log('Not done');

			}else{

				log(" built" ,program.name + ".js")
				log(" built" ,program.name + ".debug.js")
				console.log('All Done');


			}

		});



	})

}

fs.stat( path.join(dir, '.doNotInstallAndBuildDependencies'), function(err, stat){

	var installAndBuildDependencies = program.force;

	if(err){

		installAndBuildDependencies = true;

		fs.writeFile( path.join(dir, '.doNotInstallAndBuildDependencies'), 'This file stops the build program installing and build dependencies', 'utf8', function(err){

			if(err){

				throw new Error("Unable to write lock file");

			}

		})

	}
	// only build if build dependencies is true. 
	if(installAndBuildDependencies === true){

			console.log('spooling up install process');

			var proc = spawn(process.execPath, [ path.resolve(dir, path.relative(dir, path.resolve(path.join(__dirname, 'node_modules/component/bin/component-install'))))], { cwd : dir});

			proc.stdout.on('data', function( data ){

				console.log('' + data);

			})
			proc.stderr.on('data', function( data ){

				console.log('' + data);

			})
			

			proc.on('exit', function(){

				mainBuild();

				console.log("Building local components in /local");
				var root = path.join(dir, '/local');

				fs.readdir( root, function(err, files){

					if(!err){

						files.forEach(function(file){

							fs.stat( path.join(root, file), function(err, stat){

								if(stat.isDirectory()){

									var comconf = require( path.join(root, file, '/component.json') );

									if(comconf.dependencies && !isEmptyObject(comconf.dependencies)){

										log(' install', file)
										var modDir = path.join( root, file);
										var proc = spawn(process.execPath, [ path.resolve(modDir, path.relative(modDir, path.join(__dirname, '/node_modules/component/bin/component'))) , 'install'], { cwd : modDir });
										proc.on('exit', function(){

											//log("build", file);
											var depbuild = spawn(process.execPath, [__dirname + '/component-build', '-t'], { cwd : path.join(root, file) });
											
											depbuild.stdout.on('data', function(data){

												console.log('' + data);

											});
											depbuild.stderr.on('data', function(data){

												console.log('' + data);

											});										
											depbuild.on('exit', function(){

												log(" complete", file);

											})

										})


									} else {

									
										var depbuild = spawn(process.execPath, [__dirname + '/component-build', '-t'], { cwd : path.join(root, file) });
										
											depbuild.stdout.on('data', function(data){

												console.log('' + data);

											});
											depbuild.stderr.on('data', function(data){

												console.log('' + data);

											});	
										
										depbuild.on('exit', function(){

											log(" complete", file);

										})

									}

								}

							})

							
						})


					}

				});



			});



	} else {

		mainBuild();

	}


});