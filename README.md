# dotnet-watch-attach

`dotnet-watch-attach` is a very simple extension which supports developers working with the `dotnet watch` ([link](https://docs.microsoft.com/en-us/aspnet/core/tutorials/dotnet-watch?view=aspnetcore-5.0)) command. It is basically a simple wrapper around the `coreclr` debugger from the c# extension which watches your process list for a given processname.

## Requirements

- Microsofts C# extension ([link](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp))

## Configuration

Configuration is simple, you need two tasks: one to start watching and one terminate the watch task and then the `dotnet-watch-attach` debug configuration. The `coreclr` attach task is fully configurable using the `args` property.

```
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "dotnetwatchattach",
      "request": "launch",
      "name": ".NET Watch Attach",
      "args": { // Args to pass to coreclr attach
        "env": {
          "ASPNETCORE_ENVIRONMENT": "Development"
        }
      },
      "preLaunchTask": "watch",
      "postDebugTask": "terminatewatch",
      "program": "<startup-project-name>.exe"
    }
  ]
}
```

```
// tasks.json
{
  "version": "2.0.0",
  "inputs": [
    // Little trick to automatically terminate watch task.
    {
      "id": "terminatewatchparam",
      "type": "command",
      "command": "workbench.action.tasks.terminate",
      "args": "watch"
    }
  ],
  "tasks": [
    {
      "label": "watch",
      "command": "dotnet",
      "type": "process",
      "args": [
        "watch",
        "run",
        "${workspaceFolder}/<path-to-project>.csproj",
        "/property:GenerateFullPaths=true",
        "/consoleloggerparameters:NoSummary"
      ],
      "problemMatcher": "$msCompile",
      "isBackground": true
    },
    {
      "label": "terminatewatch",
      "type": "shell",
      "command": "echo ${input:terminatewatchparam}",
      "problemMatcher": []
    }
  ]
}
```

---

## Known Issues

None yet...

---
