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

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl p-6 mt-8" role="alert">
          <h2 className="text-lg font-semibold text-slate-800">
            This section could not load
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Check your connection and reload Jijiga Express to try again.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
