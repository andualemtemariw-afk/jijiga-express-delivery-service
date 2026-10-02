import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[MapErrorBoundary] Intercepted map render issue:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-72 rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Map Loading Fallback</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Google Maps Platform encountered an error while loading tiles. Switched to offline telemetry mode.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Map Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
