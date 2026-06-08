'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/sentry';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800">Something went wrong</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            The app hit an unexpected error. Reload to continue — your saved clips are safe.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
