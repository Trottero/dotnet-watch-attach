import { execFileSync } from 'child_process';
import {
  BehaviorSubject,
  catchError,
  delay,
  from,
  mapTo,
  Observable,
  of,
  retryWhen,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import * as vscode from 'vscode';
import { Disposable } from 'vscode';
import { WatchAttachLogger } from './logging/watchAttachLogger';
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

  private _watchAttachLogger = WatchAttachLogger.instance;

  private _errorCount = 0;

  constructor() {
    this._tryAttachSubscription = this._tryAttach
      .pipe(
        switchMap((debugSession) =>
          this.attach(debugSession).pipe(
            retryWhen((errors) =>
              errors.pipe(
                tap((_) => {
                  if (this._errorCount >= 5) {
                    throw new Error('Error count has reached 5 - stopping retry attempts');
                  }
                }),
                delay(this._pollingInterval)
              )
            ),
            catchError((error: Error) => {
              this._watchAttachLogger.log('Error occurred: ' + error.message);
              this._watchAttachLogger.log('If you see this, please file an issue on GitHub');
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
        this._watchAttachLogger.log('Child debug session terminated, restarting...');
        // Use the existing session as param.
        if (this._session !== null) {
          this._tryAttach.next(this._session as vscode.DebugSession);
        }
      }

      // If parent process was closed (the user stopped the debug session)
      if (debugSession.type === 'dotnetwatchattach') {
        this._watchAttachLogger.log('Host debug session terminated, cleaning up...');
        this._session = null;

        // Dispose of the task execution if it exists.
        if (this._taskExecution !== null) {
          this._watchAttachLogger.log(
            'A task was configured; terminating the task launched by Watch Attach'
          );
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

        this._watchAttachLogger.log(`Attaching to ${this.config.program}...`);

        // Start coreclr debug session.
        return from(
          vscode.debug
            .startDebugging(
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
            )
            .then((success) => {
              if (!success) {
                this._watchAttachLogger.log(
                  `The running program check passed but Watch Attach failed to attach to ${
                    this.config.program
                  }, count: ${this._errorCount + 1}`
                );
                this._errorCount++;
                throw new Error('Application not running');
              }
              this._watchAttachLogger.log(`Successfully attached to ${this.config.program}`);
              this._errorCount = 0;
            })
        ).pipe(mapTo(this._errorCount));
      })
    );
  }

  public applicationRunning(programName: string): boolean {
    if (process.platform === 'win32') {
      const args = ['tasklist', '/fi', `"IMAGENAME eq ${programName}"`];
      const result = execFileSync('powershell.exe', args, {
        encoding: 'utf8',
      });
      return result.includes(programName.slice(0, 25));
    } else if (process.platform === 'linux') {
      const args = ['-eo', 'cmd'];
      const result = execFileSync('ps', args, {
        encoding: 'utf8',
      });
      const reg = new RegExp(`\/bin.*\/net.*\/${programName}`);
      return reg.test(result);
    } else if (process.platform === 'darwin') {
      const args = ['-aco', 'command'];
      const result = execFileSync('ps', args, {
        encoding: 'utf8',
      });
      return result.includes(programName);
    }
    return false;
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
