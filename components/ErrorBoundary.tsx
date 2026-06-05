'use client';

import React from 'react';
import { track } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    track('app_crash', { error: error.message, componentStack: info.componentStack?.slice(0, 500) });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">✈️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            TravelPanel hit an unexpected error. Your saved clips are safe — they're stored locally on your device.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            Restart app
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left max-w-sm">
              <summary className="text-xs text-gray-400 cursor-pointer">Error details</summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
