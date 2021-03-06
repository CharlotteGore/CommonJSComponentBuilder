﻿
Function Resolve-ProjectName {
    param(
        [parameter(ValueFromPipelineByPropertyName = $true)]
        [string[]]$ProjectName
    )
    
    if($ProjectName) {
        $projects = Get-Project $ProjectName
    }
    else {
        # All projects by default
        $projects = Get-Project
    }
    
    $projects
}

Function Get-MSBuildProject {
    param(
        [parameter(ValueFromPipelineByPropertyName = $true)]
        [string[]]$ProjectName
    )
    Process {
        (Resolve-ProjectName $ProjectName) | % {
            $path = $_.FullName
            @([Microsoft.Build.Evaluation.ProjectCollection]::GlobalProjectCollection.GetLoadedProjects($path))[0]
        }
    }
}

$project = Get-Project
$buildProject = Get-MSBuildProject

$existingImports = $buildProject.Xml.Imports | where {$_.Project -eq "CommonJsBuild.msbuild.Targets"}
foreach ($import in $existingImports) {
	$buildProject.Xml.RemoveChild($import)
}

$project.Save()