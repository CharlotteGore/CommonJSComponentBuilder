var BuildArgs = function( buildPath ){

	this.pathToBuilder = buildPath;
	this.append = false;
	this.testableOnly = false;
	this.out

	return this;

};

BuildArgs.prototype = {
	
	outputTo : function( path ){

		this.out = path;
		return this;
	},

	withBaseName : function( name ){

		this.baseName = name;
		return this;
	},

	andAppendEntry : function(){

		this.append = true;
		return this;

	},

	andOnlyTestable : function(){

		this.testableOnly = true;
		return this;

	},

	toArgs : function(){

		var args = [this.pathToBuilder];

		if(this.out){

			args.push('-o');
			args.push(this.out);

		}

		if(this.baseName){

			args.push('-n');
			args.push(this.baseName);

		}

		if(this.append){

			args.push('-a');

		}

		if(this.testableOnly){

			args.push('-t');

		}

		return args;

	}

			
}


module.exports = exports = function( buildPath ){

	return new BuildArgs( buildPath );

}