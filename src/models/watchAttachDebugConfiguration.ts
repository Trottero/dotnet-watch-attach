import { DebugConfiguration } from 'vscode';

export interface WatchAttachDebugConfiguration extends DebugConfiguration {
  /**
   * Program to attach to.
   */
  program: string;
}

export const defaultCoreClrDebugConfiguration = {
  type: 'coreclr',
  request: 'attach',
  name: '.NET Watch Attach Auto',
};
