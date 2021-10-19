'use strict';

import { timeout } from 'rxjs';
import * as vscode from 'vscode';
import { ProviderResult } from 'vscode';
import { WatchAttach } from './watchAttach';
import { WatchAttachSession } from './watchAttachSession';

export function activateWatchAttach(context: vscode.ExtensionContext) {
  const provider = new WatchAttachConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('dotnetwatchattach', provider)
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      'dotnetwatchattach',
      new InlineDebugAdapterFactory()
    )
  );

  setTimeout(() => {
    WatchAttach.startWatchScanner();
  }, 200);
}

class WatchAttachConfigurationProvider implements vscode.DebugConfigurationProvider {
  // Do config checks here.

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    // if launch.json is missing or empty
    if (!config.type && !config.request && !config.name) {
      return undefined;
    }

    if (!config.program) {
      return vscode.window.showInformationMessage('Cannot find a program to debug').then((_) => {
        return undefined; // abort launch
      });
    }

    if (!config.args) {
      config.args = {};
    }

    WatchAttach.config = config;

    return config;
  }
}

export interface FileAccessor {
  readFile(path: string): Promise<string>;
}

export const workspaceFileAccessor: FileAccessor = {
  async readFile(path: string) {
    try {
      const uri = vscode.Uri.file(path);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const contents = Buffer.from(bytes).toString('utf8');
      return contents;
    } catch (e) {
      try {
        const uri = vscode.Uri.parse(path);
        const bytes = await vscode.workspace.fs.readFile(uri);
        const contents = Buffer.from(bytes).toString('utf8');
        return contents;
      } catch (e) {
        return `cannot read '${path}'`;
      }
    }
  },
};

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    _session: vscode.DebugSession
  ): ProviderResult<vscode.DebugAdapterDescriptor> {
    return new vscode.DebugAdapterInlineImplementation(new WatchAttachSession('abc.txt'));
  }
}
