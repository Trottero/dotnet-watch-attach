import { DebugConfiguration } from 'vscode';

export interface WatchAttachDebugConfiguration extends DebugConfiguration {
  /**
   * Program to attach to. This is usually the name of the startup `.csproj` file with the `.exe` extension appended.
   *
   * e.g. to debug the process from `dotnet watch run weather.csproj`, set this to `weather.exe`. Do note that this is different depending
   * on your dotnet version.
   */
  program: string;
  /**
   * The label of a dotnet watch task to run as defined in `tasks.json`
   *
   * This task will automatically be run when the debug session starts, and terminated when the debug session ends.
   *
   * NOTE: It is not required to set `isBackground: true` for this task.
   */
  task: string;
}

export const WATCH_ATTACH_AUTO_NAME = '.NET Watch Attach (Child attach)';

export const defaultCoreClrDebugConfiguration = {
  type: 'coreclr',
  request: 'attach',
  name: WATCH_ATTACH_AUTO_NAME,
};
