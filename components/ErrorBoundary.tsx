'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    // Log to console in dev; PostHog/Sentry would go here
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-6 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
