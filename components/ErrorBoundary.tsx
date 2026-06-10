'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const isDev = process.env.NODE_ENV === 'development';

  function clearAndReload() {
    try {
      indexedDB.deleteDatabase('TravelPanel');
    } catch {}
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-5">🚨</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        An unexpected error occurred. Your saved data is safe.
      </p>

      {isDev && (
        <pre className="bg-gray-100 text-red-700 text-xs rounded-xl px-4 py-3 mb-6 max-w-sm text-left overflow-x-auto whitespace-pre-wrap">
          {error.message}
        </pre>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white font-semibold py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          Reload app
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-indigo-600 font-medium text-sm py-2"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={clearAndReload}
          className="text-gray-400 font-medium text-sm py-2 border-t border-gray-200 mt-1"
        >
          Clear data &amp; reload
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to PostHog if available
    try {
      import('@/lib/analytics').then(({ track }) => {
        track('app_crash', {
          message: error.message,
          stack: info.componentStack?.slice(0, 500) ?? '',
        });
      });
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
