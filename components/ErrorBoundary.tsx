'use client';

import React from 'react';
import { track } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    try { track('js_error', { message: error.message }); } catch { /* analytics unavailable */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h2>
        <code className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2 mb-6 max-w-xs block truncate">
          {this.state.errorMessage}
        </code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white font-semibold px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Reload app
        </button>
      </div>
    );
  }
}
