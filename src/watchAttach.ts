import {
  BehaviorSubject,
  catchError,
  delay,
  Observable,
  of,
  retryWhen,
  Subject,
  Subscription,
  switchMap,
} from 'rxjs';
import { Disposable } from 'vscode';
import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import {
  defaultCoreClrDebugConfiguration,
  WatchAttachDebugConfiguration,
  WATCH_ATTACH_AUTO_NAME,
} from './models/watchAttachDebugConfiguration';

export class WatchAttach implements Disposable {
  public get config(): WatchAttachDebugConfiguration {
    return this._session?.configuration as WatchAttachDebugConfiguration;
  }

  private _tryAttach = new Subject<vscode.DebugSession>();

  private _session: vscode.DebugSession | null = null;

  private _taskExecution: Thenable<vscode.TaskExecution> | null = null;

  private _pollingInterval = 100;

  private _tryAttachSubscription: Subscription;

  private _disposables: Disposable[] = [];

  constructor() {
    this._tryAttachSubscription = this._tryAttach
      .pipe(
        switchMap((debugSession) =>
          this.attach(debugSession).pipe(
            retryWhen((errors) => errors.pipe(delay(this._pollingInterval))),
            catchError((x) => {
              return of(5);
            })
          )
        )
      )
      .subscribe();
  }

  public startWatchAttach() {
    const onStartDebug = vscode.debug.onDidStartDebugSession((debugSession) => {
      // Only start if it was started by this extension.
      if (debugSession.type !== 'dotnetwatchattach') {
        return;
      }

      // Upon starting the debug session, store the parent in this service and try to attach a .NET debugger
      this._session = debugSession;
      this._tryAttach.next(debugSession);

      // If the user has defined a specific task to run, run it.
      if (this.config.task) {
        this.startExternalTask(this.config.task);
      }
    });
    this._disposables.push(onStartDebug);

    const onTerminateDebug = vscode.debug.onDidTerminateDebugSession((debugSession) => {
      // If the automatically created process was terminated
      // This is also what happens when the application reload
      if (debugSession.name === WATCH_ATTACH_AUTO_NAME) {
        // Use the existing session as param.
        if (this._session !== null) {
          this._tryAttach.next(this._session as vscode.DebugSession);
        }
      }

      // If parent process was closed (the user stopped the debug session)
      if (debugSession.type === 'dotnetwatchattach') {
        this._session = null;

        // Dispose of the task execution if it exists.
        if (this._taskExecution !== null) {
          this._taskExecution.then((taskExecution) => {
            taskExecution.terminate();
            this._taskExecution = null;
          });
        }
      }
    });
    this._disposables.push(onTerminateDebug);
  }

  public attach(watchAttachSession: vscode.DebugSession): Observable<number> {
    // Behaviour subject so the observable is hot.
    return new BehaviorSubject(0).pipe(
      switchMap((_) => {
        if (!this.applicationRunning(this.config.program)) {
          // Errors are caught by the retry.
          throw new Error('Application not running');
        }

        // Start coreclr debug session.
        vscode.debug.startDebugging(
          undefined,
          {
            ...this.config.args,
            ...defaultCoreClrDebugConfiguration,
            processName: this.config.program,
          },
          {
            parentSession: watchAttachSession,
            consoleMode: vscode.DebugConsoleMode.MergeWithParent,
            compact: true,
          }
        );
        return of(0);
      })
    );
  }

  public applicationRunning(programName: string): boolean {
    if (process.platform === 'win32') {
      const args = ['tasklist', '/fi', `"IMAGENAME eq ${programName}"`];
      const result = execFileSync('powershell.exe', args, {
        encoding: 'utf8',
      });
      return result.includes(programName);
    } else {
      let args = ['-o pid, ppid, command'];
      const result = execFileSync('ps', args, {
        encoding: 'utf8',
      });
      return result.includes(programName);
    }
  }

  private startExternalTask(taskName: string): void {
    vscode.tasks.fetchTasks().then((taskList) => {
      const taskDefinition = taskList.filter((task) => task.name === taskName)?.[0];
      if (!taskDefinition) {
        // Let the user know that the task is not found.
        vscode.window.showErrorMessage(
          `Debugger can not be started, task "${taskName}" not found. Check if it is defined in your tasks.json file.`,
          'Close'
        );
        vscode.debug.stopDebugging(this._session as vscode.DebugSession);
        return;
      }

      this._taskExecution = vscode.tasks.executeTask(taskDefinition);
    });
  }

  dispose() {
    this._tryAttachSubscription.unsubscribe();
    this._disposables.forEach((x) => x.dispose());
  }
}
