module CommonJsBuild.Spec
open Xunit
open Swensen.Unquote
open CommonJsBuild
open System.IO
open System.Reflection


let buildDir = (Directory.GetParent(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))).Parent.FullName
let (success,arguments,stdout,stderr) = (Builder.buildModules {baseDir=buildDir;outputDir="public/javascripts"}) |> Array.toList |> List.head

printf "%s" stdout

[<Fact>]
let ``Build uses relative path to source of module`` ()=
    test <@ arguments.Contains "-e commonjs\\test" @>

[<Fact>]
let ``Build uses relative path to output path`` ()=
    test <@ arguments.Contains "-o public/javascripts" @>

[<Fact>]
let ``Build uses folder name of component as output module name`` ()=
    test <@ arguments.Contains "-n test" @>

[<Fact>]
let ``Build exited cleanly`` ()=
    test <@ success = true @>

[<Fact>]
let ``Stderr does not have interesting things`` ()=
    test <@ stderr = "" @>

[<Fact>]
let ``Has created output js`` ()=
    test <@ File.Exists (Path.Combine (buildDir,"public/javascripts/test.js"))@>

[<Fact>]
let ``Has created debug js`` ()=
    test <@ File.Exists (Path.Combine (buildDir,"public/javascripts/test.debug.js"))@>
