var path = require('path');

module.exports.install = function(dirname){

	return path.resolve( dirname, path.join( dirname, 'node_modules/component/bin/component-install' ) );
	 
}

module.exports.build = function(dirname){

	return path.resolve( dirname, path.join( dirname, 'component-build' ) );

}