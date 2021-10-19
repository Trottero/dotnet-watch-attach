import { DebugConfiguration } from 'vscode';

export interface WatchAttachDebugConfiguration extends DebugConfiguration {
  /**
   * Program to attach to.
   */
  program: string;
}

export const WATCH_ATTACH_AUTO_NAME = '.NET Watch Attach (Child attach)';

export const defaultCoreClrDebugConfiguration = {
  type: 'coreclr',
  request: 'attach',
  name: WATCH_ATTACH_AUTO_NAME,
};
