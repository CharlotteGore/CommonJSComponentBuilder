namespace CommonJsBuild

module Environment = 
    open System.Reflection
    open System.Resources
    open System.Diagnostics
    open System.IO
    open System.IO.Compression
    open Microsoft.FSharp.Control.CommonExtensions
    open Ionic.Zip

    let (inner, outer, unpacked) = ("","",false)
    let baseDir = Path.GetDirectoryName (Assembly.GetExecutingAssembly().Location)
    let extractTo = Path.Combine (baseDir,"__commonjs_build")
    let buildDir = Path.Combine(extractTo,"build")
    let nodePath = Path.Combine(extractTo,"node.exe")

    let resource name =
        let manager = new ResourceManager("Properties.Resources",Assembly.GetExecutingAssembly()) 
        manager.GetStream(name)

    let unpack () = 
        lock outer (fun ()->   
            match unpacked,Directory.Exists extractTo with
            | false,false -> lock inner (fun ()->
                use archive = ZipFile.Read(resource "build")
                archive.ExtractAll buildDir
                using (File.OpenWrite(nodePath)) ((resource "node").CopyTo)
                printf "Extracted build system requirements to %s" extractTo)
            | _,_ -> ()
        )

    type ProcessResult = { exitCode : int; stdout : string; stderr : string }

    let private executeProcess exe cmdline workingDir =
        let psi = new System.Diagnostics.ProcessStartInfo(exe,cmdline) 
        psi.WorkingDirectory <- workingDir
        psi.UseShellExecute <- false
        psi.RedirectStandardOutput <- true
        psi.RedirectStandardError <- true
        psi.CreateNoWindow <- true

        let output = new System.Text.StringBuilder()
        let error = new System.Text.StringBuilder()

        let invoke () = 
            use p = System.Diagnostics.Process.Start(psi) 
            p.OutputDataReceived.Add(fun args -> output.Append(args.Data) |> ignore)
            p.ErrorDataReceived.Add(fun args -> error.Append(args.Data) |> ignore)
            p.BeginErrorReadLine()
            p.BeginOutputReadLine()
            p.WaitForExit() 
            p.ExitCode

        (invoke(),output.ToString(),error.ToString())

    let runNode args workingDir = 
        unpack()
        let (status,stdout,stderr) = executeProcess nodePath args workingDir
    
        (status = 0,args,stdout,stderr)


    
module Builder = 
    open System.IO

    let cleanBuildSystem () =
        if (Directory.Exists Environment.extractTo) then 
            Directory.Delete (Environment.extractTo,true)

    let shittyRel (path:string) baseDir =
        path.Replace (baseDir + "\\","")

    let build baseDir outputPath (comp:FileInfo) = 
        async{
            return Environment.runNode (sprintf
                "%s/commonjs-build/commonjs-build.js -e %s -o %s -n %s -f" 
                    Environment.buildDir 
                    (shittyRel comp.Directory.FullName baseDir) 
                    outputPath
                    comp.Directory.Name
                ) baseDir
        }

    type buildConfig = {baseDir:string;outputDir:string}
    let buildModules (buildConfig:buildConfig) =
        (DirectoryInfo buildConfig.baseDir).GetFiles("entry.js",SearchOption.AllDirectories)
            |> Array.toSeq
            |> Seq.map (build buildConfig.baseDir buildConfig.outputDir)
            |> Async.Parallel 
            |> Async.RunSynchronously

open Microsoft.Build.Framework
type MsBuildTask () =
    inherit Microsoft.Build.Utilities.Task ()
    let mutable outputDir = "public/javascripts"
    let mutable baseDir = System.IO.Path.GetDirectoryName((System.Reflection.Assembly.GetExecutingAssembly().Location))
    member this.BaseDirectory
        with get () = baseDir
        and set (value) = baseDir <- value
    member this.OutputDirectory
        with get () = outputDir
        and set (value) = outputDir <- value


    override this.Execute () =
        let allsuccess = ref true

        let log success stdout stderr = 
            match success with
            | true -> this.Log.LogMessage stdout
            | false -> 
                allsuccess := false
                this.Log.LogError stderr

        for (success,args,stdout,stderr) in (Builder.buildModules {baseDir=baseDir;outputDir=outputDir}) do
            log success stdout stderr

        allsuccess.Value