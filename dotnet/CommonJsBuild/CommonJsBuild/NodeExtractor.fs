﻿namespace CommonJsBuild

module Environment = 
    open System.Reflection
    open System.Resources
    open System.Diagnostics
    open System.IO
    open System.IO.Compression
    open Microsoft.FSharp.Control.CommonExtensions
    open Ionic.Zip

    let (inner, outer, unpacked) = ("","",false)
    let baseDir = Path.GetDirectoryName (System.Uri.UnescapeDataString(System.UriBuilder(Assembly.GetExecutingAssembly().CodeBase).Path))
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
            let res = p.ExitCode
            p.Dispose()
            res

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
                "%s/commonjs-build.js -e %s -o %s -n %s" 
                    Environment.buildDir 
                    (shittyRel comp.Directory.FullName baseDir) 
                    outputPath
                    comp.Directory.Name
                ) baseDir
        }

    let clean baseDir (comp:FileInfo) = 
        async{
            return Environment.runNode (sprintf
                "%s/commonjs-build.js -e %s -c" 
                    Environment.buildDir 
                    (shittyRel comp.Directory.FullName baseDir) 
                ) baseDir
        }

    let inventory baseDir (comp:FileInfo) = 
        async{
            return Environment.runNode (sprintf
                "%s/commonjs-build.js -e %s -i" 
                    Environment.buildDir 
                    (shittyRel comp.Directory.FullName baseDir) 
                ) baseDir
        }

    let private files baseDir action = 
        (DirectoryInfo baseDir).GetFiles("entry.js",SearchOption.AllDirectories)
        |> Array.toSeq
        |> Seq.map action
        |> Async.Parallel 
        |> Async.RunSynchronously

    type buildConfig = {baseDir:string;outputDir:string}

    let buildModules (buildConfig:buildConfig) = 
        files buildConfig.baseDir (build buildConfig.baseDir buildConfig.outputDir)

    let cleanModules (buildConfig:buildConfig) = 
        files buildConfig.baseDir (clean buildConfig.baseDir)

    let inventoryOfModules (buildConfig:buildConfig) =
        files buildConfig.baseDir (inventory buildConfig.baseDir)

    let logBuild builder logMessage logError baseDir outputDir = 
        let allsuccess = ref true

        logMessage (sprintf "Building component js from %s to %s" baseDir outputDir)

        let log success stdout stderr =   
            match success with
            | true -> logMessage stdout
            | false -> 
                allsuccess := false
                logError stderr

        for (success,args,stdout,stderr) in (builder {baseDir=baseDir;outputDir=outputDir}) do
            logMessage (sprintf "Attempting to build components using %s" args)
            log success stdout stderr

        allsuccess.Value

    let gatherInventory builder logMessage logError baseDir outputDir =
        let allsuccess = ref true

        logMessage (sprintf "Getting component js from %s" baseDir)

        use referenceFile = File.Open (Path.Combine (outputDir,"_references.js"),
                                        FileMode.Truncate ||| FileMode.Append,
                                        FileAccess.Write)
        
        use writer = new StreamWriter (referenceFile)


        let appendReferences (stdout:string) = 
            for line in stdout.Split('\r') do
                writer.WriteLine (sprintf "//<Reference source=\"%s\"/>" line)
            

        for (success,args,stdout,stderr) in (builder {baseDir=baseDir;outputDir=outputDir}) do
            if (success) then appendReferences stdout
                            

        allsuccess.Value

open Microsoft.Build.Framework


type Build () = 
    inherit Microsoft.Build.Utilities.Task ()
    let mutable outputDir = "public/javascripts"
    let mutable baseDir = System.IO.Path.GetDirectoryName((System.Reflection.Assembly.GetExecutingAssembly().Location))
    member this.BaseDirectory
        with get () = baseDir
        and set (value) = baseDir <- value
    member this.OutputDirectory
        with get () = outputDir
        and set (value) = outputDir <- value

    override this.Execute () = Builder.logBuild 
                                    Builder.buildModules 
                                    this.Log.LogMessage 
                                    this.Log.LogError 
                                    this.BaseDirectory 
                                    this.OutputDirectory

type Clean () = 
    inherit Microsoft.Build.Utilities.Task ()
    let mutable outputDir = "public/javascripts"
    let mutable baseDir = System.IO.Path.GetDirectoryName((System.Reflection.Assembly.GetExecutingAssembly().Location))
    member this.BaseDirectory
        with get () = baseDir
        and set (value) = baseDir <- value
    member this.OutputDirectory
        with get () = outputDir
        and set (value) = outputDir <- value

    override this.Execute () = Builder.logBuild 
                                    Builder.cleanModules 
                                    this.Log.LogMessage 
                                    this.Log.LogError 
                                    this.BaseDirectory 
                                    this.OutputDirectory

type Inventory () = 
    inherit Microsoft.Build.Utilities.Task ()
    let mutable outputDir = "public/javascripts"
    let mutable baseDir = System.IO.Path.GetDirectoryName((System.Reflection.Assembly.GetExecutingAssembly().Location))
    member this.BaseDirectory
        with get () = baseDir
        and set (value) = baseDir <- value
    member this.OutputDirectory
        with get () = outputDir
        and set (value) = outputDir <- value

    override this.Execute () = Builder.logBuild 
                                    Builder.inventoryOfModules 
                                    this.Log.LogMessage 
                                    this.Log.LogError 
                                    this.BaseDirectory 
                                    this.OutputDirectory
        