'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
  expanded: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, expanded } = this.state;

    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 shadow-lg">
          <span className="text-white text-3xl">✈</span>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-8 max-w-xs">
          TravelPanel hit an unexpected error. Your saved clips are safe — reload to continue.
        </p>

        <button
          type="button"
          onClick={this.handleReload}
          className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Reload app
        </button>

        {isDev && (
          <div className="mt-8 w-full max-w-sm text-left">
            <button
              type="button"
              onClick={() => this.setState((s) => ({ expanded: !s.expanded }))}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2"
            >
              <span>{expanded ? '▾' : '▸'}</span>
              {expanded ? 'Hide' : 'Show'} error details
            </button>
            {expanded && (
              <pre className="text-xs bg-red-50 border border-red-200 rounded-xl p-4 overflow-auto max-h-64 text-red-700 whitespace-pre-wrap break-words">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }
}
