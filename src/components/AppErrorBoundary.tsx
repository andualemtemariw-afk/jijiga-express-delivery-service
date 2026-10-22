import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Application rendering failed:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl p-6 mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center" role="alert">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Workspace Refresh Required
          </h2>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            A temporary connection or module update occurred. Click "Try Again" or reload the app to resume.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
