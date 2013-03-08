var program = require('commander');
var path = require('path');
var fs = require('fs');
var log = require('./lib/utils').log;
var error = require('./lib/utils').error;
var fatal = require('./lib/utils').fatal;
var spawn = require('child_process').spawn;
var rmdir = require('./lib/utils').rmdir;
var spawner = require('./lib/spawner');
var installerPath = require('./lib/path-helper').install;
var buildPath = require('./lib/path-helper').build;
var buildArgs = require('./lib/build-args-helper');
var gatherer = require('gatherer');

program
	.version('0.0.1')
	.option('-e, --entry [file]', 'Entry point')
	.option('-o, --output [file]', 'Output dir', '/build')
	.option('-n, --name [name]', 'Base name for output file', 'build')
	.option('-q --quick', 'Quick build, no install')
	.option('-c --clean', 'Clean up all Components and Builds')
	.option('-i --inventory', 'Get a list of all source files')
	.option('-l --local [file]', "Local module directory", '/local')
	.parse(process.argv);

var isEmptyObject = function(obj) {
  return !Object.keys(obj).length;
}


var Builder = function(){

	var self = this;

	self.entry = path.resolve( program.entry );
	self.output = path.resolve( program.output );
	self.baseName = program.name;

	self.installPath = installerPath( __dirname );
	self.buildPath = buildPath( __dirname );
	self.localModules = path.resolve( self.entry, path.join(self.entry, program.local) );

	try{

		self.conf = require( path.join(self.entry, 'component.json') );

	}catch(e){

		throw new Error("Unable to load component.json from " + self.entry);

	}

	if( program.clean ){

		self.clean(function(){

			console.log("Clean complete");

		});

	} else if( program.inventory ){

		self.getInventoryOfSources(function(){



		})

	} else {

		if( program.quick){

			console.log("Skipping install and local module build");

			self.buildApplication( function( err ){

				if(err){

					console.log("Build failed");
					fatal('Build failed');

				} else {

					console.log("All done");

				}

			});

		} else {

			self.installApplicationDependencies( function( err ){

				if(err){

					console.log("Install of dependencies failed");
					fatal('Install failed');

				} else {

					self.buildLocalModules( function( err ){

						if(err){

							console.log("Building local modules failed. Will attempt to build Application anyway.");

						}

						self.buildApplication(function( err ){

							if(err){

								console.log("Build failed");
								console.log("Build failed");
								fatal('Build failed');

							} else {

								console.log("All done");

							}

						});


					});

				}

			})

		}

	}

	return self;

};

Builder.prototype = {

	buildApplication : function( callback ){

		var self = this,
			target = self.baseName + ".js";

		log("Building Application", target)

		var args = buildArgs( self.buildPath )
					.outputTo( self.output )
					.withBaseName( self.baseName )
					.andAppendEntry()
					.toArgs();

		spawner( process.execPath )
			.withArguments( args )
			.inWorkingDirectory( self.entry )
			.onStdout(function(){})
			.execute( function( err ){

				if(!err){

					callback();

				} else {

					callback("Failed");

				}

			});

		return self;

	},

	installApplicationDependencies : function( callback ){

		var self = this,
			target = self.baseName;

		log("Installing Application Dependencies", target );
		spawner(process.execPath)
			.withArguments( [ self.installPath ] )
			.inWorkingDirectory( self.entry )
			.onStdout(function(){})
			.execute(function( err ){

				if(!err){

					callback();

				} else {

					callback("Install failed");

				}

			})

	},

	buildLocalModules : function( callback ){

		var self = this,
			gathering = gatherer();

		log("Building local modules", self.localModules);

		fs.readdir( self.localModules, function(err, folders){

			if(err){

				console.log("No local modules founds");
				callback("No local modules found");

			} else {

				folders.forEach( function( folder ){

					var modDir = path.join(self.localModules, folder);
					var modConf = path.join(modDir, 'component.json');

					try{

						var conf = require(modConf);

						gathering.createInvitation( function(accept, decline){

							self.installLocalModule(modDir, function(err){

								if(!err){

									self.buildLocalModule(modDir, function(err){

										if(!err){

											log("Local Module Built", folder)
											accept();

										}else{

											error("Build Failed", folder);
											decline();

										}

									})

								}else{

									error("Install Failed", folder);
									decline();

								}

							})

						});


					}catch(e){

						log("Ignoring", folder);

					}

				});

				gathering.sendInvitations( function(err){

					if(!err){

						callback();

					} else {

						console.log( err + " not built" )
						callback( err + " not built" );

					}

				});

			}

		});

		return self;

	},

	installLocalModule : function( folder,  callback ){
		
		var self = this,
			target = folder;

		spawner(process.execPath)
			.withArguments( [ self.installPath ] )
			.inWorkingDirectory( folder )
			.onStdout(function(){})
			.execute(function( err ){

				if(!err){

					callback();

				} else {

					callback("Install failed");

				}

			})

		return this;

	},

	buildLocalModule : function( folder,  callback ){

		var self = this;

		var args = buildArgs( self.buildPath )
					.andOnlyTestable()
					.toArgs();

		spawner( process.execPath )
			.withArguments( args )
			.inWorkingDirectory( folder )
			.onStdout(function(){})
			.execute( function( err ){

				if(!err){

					callback();

				} else {

					callback("Validation failed");

				}

			});

		return this;

	},

	getInventoryOfSources : function( callback ){

		var self = this;
		var components = path.join( self.entry, "components");
		var gathering = gatherer();

		gathering.createInvitation(function(accept, decline){

			self.conf.scripts.forEach(function(script){

				console.log( path.relative(self.entry, path.join(self.entry, script) ));

			});

			accept();

		});


		gathering.createInvitation(function(accept, decline){

			fs.readdir( components, function(err, modules){

				if(!err){

					modules.forEach(function( modDir ){

						var conf = require( path.join(components, modDir, 'component.json') );

						conf.scripts.forEach(function(script){

							console.log( path.relative(self.entry, path.join(components, modDir, script) ) );

						});
					});

				}

				accept();

			})


		});

		gathering.createInvitation(function(accept, decline){

			fs.readdir( self.localModules, function(err, modules){

				if(!err){

					modules.forEach(function( modDir ){

						try {

							var conf = require( path.join(self.localModules, modDir, 'component.json') );

							conf.scripts.forEach(function(script){

								console.log( path.relative(self.entry, path.join(self.localModules, modDir, script) ) );

							});

						}catch(e){


						}
						
					});

				}

				accept();

			})
	

		});

		gathering.sendInvitations(function(){

			callback();

		});

		callback();

	},

	clean : function( callback ){

		var self = this;
		var components = path.join( self.entry, "components");
		var gathering = gatherer();

		fs.stat( components, function(err, stat){

			if(!err && stat.isDirectory()){

				rmdir( components );

			}

		});

		fs.stat( self.localModules, function(err, stat){

			if(!err && stat.isDirectory()){

				fs.readdir( self.localModules, function(err, modules){

					if(!err){

						modules.forEach( function(localMod){

							gathering.createInvitation(function(accept, decline){

								var modDir = path.join( self.localModules, localMod );
								
								fs.stat( modDir, function(err, stat){

									if(!err && stat.isDirectory()){

										fs.stat( path.join(modDir, "build"), function(err, stat){

											if(!err && stat.isDirectory()){

												rmdir( path.join(modDir, 'build') );

											}	

											fs.stat( path.join(modDir, "components"), function(err, stat){

												if(!err && stat.isDirectory()){

													rmdir( path.join(modDir, 'components') );

												}

												accept();

											});
		
											
										});

									} else {

										accept();

									}

								});


							});


						});


						gathering.sendInvitations(function(){

							callback();

						})

					} else {

						callback();

					}

				});

			} else {

				callback();

			}

		});

	}

}

new Builder();