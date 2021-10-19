import {
  BehaviorSubject,
  catchError,
  delay,
  Observable,
  of,
  retryWhen,
  Subject,
  subscribeOn,
  Subscription,
  switchMap,
} from 'rxjs';
import { Disposable } from 'vscode';
import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import { defaultCoreClrDebugConfiguration } from './models/watchAttachDebugConfiguration';

export class WatchAttach implements Disposable {
  public static config: vscode.DebugConfiguration;

  private static _tryAttach = new Subject<vscode.DebugSession>();

  private static session: vscode.DebugSession;

  private static _pollingInterval = 100;

  private static sub: Subscription;

  public static startWatchScanner() {
    WatchAttach.sub = WatchAttach._tryAttach
      .pipe(
        switchMap((debugSession) =>
          WatchAttach.attach(debugSession).pipe(
            retryWhen((errors) => errors.pipe(delay(this._pollingInterval))),
            catchError((x) => {
              return of(5);
            })
          )
        )
      )

      .subscribe({
        next: (x) => {
          x;
        },
        error: (y) => {
          y;
        },
        complete: () => {
          console.log();
        },
      });

    const onStartDebug = vscode.debug.onDidStartDebugSession((debugSession) => {
      if (debugSession.type === 'dotnetwatchattach') {
        this.session = debugSession;
        WatchAttach._tryAttach.next(debugSession);
      }
    });

    const onTerminateDebug = vscode.debug.onDidTerminateDebugSession((debugSession) => {
      if (debugSession.name === '.NET Watch Attach Auto') {
        WatchAttach._tryAttach.next(this.session);
      }
      if (debugSession.type === 'dotnetwatchattach') {
        debugSession.type;
        // Clean up resources here.
      }
    });
  }

  public static attach(session: vscode.DebugSession): Observable<number> {
    // Behaviour subject so the observable is hot.
    return new BehaviorSubject(0).pipe(
      switchMap((_) => {
        if (!WatchAttach.applicationRunning()) {
          // Errors are caught by the retry.
          throw new Error('Application not running');
        }

        // Start coreclr debug session.
        vscode.debug.startDebugging(
          undefined,
          {
            ...WatchAttach.config.args,
            ...defaultCoreClrDebugConfiguration,
            processName: WatchAttach.config.program,
          },
          {
            parentSession: session,
            consoleMode: vscode.DebugConsoleMode.MergeWithParent,
          }
        );
        return of(0);
      })
    );
  }

  public static applicationRunning(): boolean {
    if (process.platform === 'win32') {
      const args = ['tasklist', '/fi', `"IMAGENAME eq ${WatchAttach.config.program}"`];
      const result = execFileSync('powershell.exe', args, {
        encoding: 'utf8',
      });
      return result.includes(WatchAttach.config.program);
    } else {
      let args = ['-o pid, ppid, command'];
      const result = execFileSync('ps', args, {
        encoding: 'utf8',
      });
      return result.includes(WatchAttach.config.program);
    }
  }

  dispose() {}
}
