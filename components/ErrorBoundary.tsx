'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to PostHog if available
    try {
      import('@/lib/analytics').then(({ track }) => {
        track('app_error', {
          message: error.message,
          stack: error.stack?.slice(0, 500),
          componentStack: info.componentStack?.slice(0, 500),
        });
      });
    } catch {
      // analytics unavailable
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-xs text-left text-red-600 bg-red-50 rounded-xl p-4 mb-4 max-w-sm overflow-auto max-h-48 w-full">
              {this.state.error.stack}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
