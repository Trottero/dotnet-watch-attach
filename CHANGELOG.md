# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2021-10-19

### Added

- Initial crude implementation
- Ability to automatically attach to processes spawned by `dotnet watch run`

## [0.1.1] - 2021-10-19

### Added

- Refactor entire code-base
- Disposal of services
- Groundwork for multiple instances of the debugger

## [0.2.0] - 2022-03-05

### Added

- Support for `dotnetwatchattach` to manage the lifetime of a specified task by defining the `task` parameter in your launch.json. I no longer advise you to use the `preLaunchTask` and `postLaunchTask` configuration properties. This has the added benefit that the `isBackground: true` property is no longer required for the task definition (fixes [#1](https://github.com/Trottero/dotnet-watch-attach/issues/1)).

## [0.2.4] - 2022-09-06

### Added

- Support for `darwin` (Thanks [loganbenjamin](https://github.com/loganbenjamin)!) and `linux` platforms (closes [#5](https://github.com/Trottero/dotnet-watch-attach/issues/5), [#6](https://github.com/Trottero/dotnet-watch-attach/issues/6))
