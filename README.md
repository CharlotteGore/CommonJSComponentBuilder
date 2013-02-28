CommonJSComponentBuilder.Net
============================

  Builds CommonJS/Component based apps. Usage:

    cd js
    npm install
    node commonjs-build.js --entry ../path/to/entry --output ../path/to/output --name basename_of_output_file
   
  - Automatically downloads and installs dependencies as defined in the `component.json`
  - Automatically builds each dependency individually, as well as the overall app.
  - Builds production and debug versions. Production version has output wrapped in anonymous function.

  This repo also has a .net package which creates a build task to automate this building. Automatically scans for folders containing `entry.js` and a `component.json` and builds.

