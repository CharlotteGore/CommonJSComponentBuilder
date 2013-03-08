CommonJSComponentBuilder.Net
============================

## Intro

  This repo contains a node app for building Component/Component based applications, as well as the F# source for a nuget package to add the Node app as a build task in Visual Studio 2012.
  
  Unlike the standard Component/Component builder (`component build`) our tooling automatically adds a call to the entry point of the application so that it is self booting.
  
  It also generates two versions of the final script: One that has the contents wrapped in an anonymous function (standard practice to avoid variable leakage) and a 'debug' version that deliberately leaks its variables.
  
  The Debug versions are used for writing tests. 
  
  We have a few conventions that must be obeyed when using the Visual Studio build task stuff: A Component/Component Application (as opposed to a basic module) is defined as a Component that has an 'entry.js' as its main script. The .Net part is searching for these entry.js files.

  We also have a convention where local modules - these are application unique modules that do not have their own Github repos, are in `/local`.

  The Node application, however, can have the location of local modules configured, and doesn't care about teh entry.js convention.
  
  A typical application file structure might look like...
  
    /myapp
      entry.js
      component.json
      /local
        /module1
          /spec
            module1.spec.js
          index.js
          component.json
        /module2
          /spec
            module2.spec.js
          index.js
          component.json
          
  Each component.json file will be listing dependencies, and each js file will be `require(something)`ing, most likely.
          
  The builder also builds local modules individually. This is so that there are discrete testable versions of these modules.
  
  After the builder is done, you would have..
  
    /myapp
      /build
        myapp.js
        myapp.debug.js
      entry.js
      component.json
      /components
        /somedependency
          index.js
          component.json
        /someotherdepenency
          index.js
          component.json
      /local
        /module1
          /build
            build.debug.js
          /spec
            module1.spec.js
          /components
            /somedepenency
              index.js
              component.json
          index.js
          component.json
        /module2
          /build
            build.debug.js
          /spec
            module2.spec.js
          /components
            /someotherdepency
              index.js
              component.json
          index.js
          component.json
          
  All dependencies installed for the app. All dependencies installed for the local modules. Local module built and the main application built.
  

### Using the Node App

  Clone this repo then

    cd js
    npm install
   
### Usage

    node commonjs-build.js -e /path/to/entry -o /path/to/out -n basename
    
  ... where basename is the name of the output file, i.e, `-n myapp` gets you `myapp.js`
  
  The paths are to folders, not files.
  
    -c --clean
    
  removes dependencies and builds of local modules
  
    -q --quick
    
  Only builds the main application. Does not build local modules or install dependencies.
    
  

