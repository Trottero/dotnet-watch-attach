import * as vscode from 'vscode';

export class WatchAttachLogger {
  private readonly channel: vscode.OutputChannel;

  private static _instance: WatchAttachLogger;
  public static get instance(): WatchAttachLogger {
    if (!WatchAttachLogger._instance) {
      WatchAttachLogger._instance = new WatchAttachLogger();
    }

    return WatchAttachLogger._instance;
  }

  private constructor() {
    this.channel = vscode.window.createOutputChannel('Watch Attach');
  }

  public log(message: string) {
    // Get the current time
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    this.channel.appendLine(`[WATCH ATTACH] [${time}] ${message}`);
  }
}
