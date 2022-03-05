# dotnet-watch-attach

[![.github/workflows/ci.yml](https://github.com/Trottero/dotnet-watch-attach/actions/workflows/ci.yml/badge.svg)](https://github.com/Trottero/dotnet-watch-attach/actions/workflows/ci.yml)

`dotnet-watch-attach` is a very simple extension which supports developers working with the `dotnet watch` ([link](https://docs.microsoft.com/en-us/aspnet/core/tutorials/dotnet-watch?view=aspnetcore-5.0)) command. It is basically a simple wrapper around the `coreclr` debugger from the c# extension which watches your process list for a given processname.

- [Extension page](https://marketplace.visualstudio.com/items?itemName=Trottero.dotnetwatchattach)

## Requirements

- Microsofts C# extension ([link](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp))

## Configuration

Configuration is simple, you need two tasks: one to start watching and one terminate the watch task and then the `dotnet-watch-attach` debug configuration. The `coreclr` attach task is fully configurable using the `args` property. A fully configured example can be found [here](https://github.com/Trottero/dotnet-watch-attach-sample)

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
      "task": "watchTaskName", // Label of watch task in tasks.json
      "program": "<startup-project-name>.exe"
    }
  ]
}
```

```
// tasks.json
{
  "version": "2.0.0",
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
      "problemMatcher": "$msCompile"
    }
  ]
}
```

---

## Known Issues

- There is a race condition where the extension checks if the proces exists, and if it does it will try to start a debug session moments later. If during that time the process is killed (by rebuilding for example) the debugger will fail to attach and terminate.

Please create an [issue / PR](https://github.com/Trottero/dotnet-watch-attach/issues) for any problems you may encounter.
