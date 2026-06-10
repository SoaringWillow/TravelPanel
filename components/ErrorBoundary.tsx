'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    try {
      // Best-effort analytics — may not be available if analytics itself errored
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__trackError?.('app_error', { message: error.message, stack: error.stack?.slice(0, 500) });
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 px-8 text-center z-[9999]">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-4xl mb-5 shadow-inner">
            😵
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-1 max-w-xs leading-relaxed">
            The app hit an unexpected error. Your saved clips are safe — they&apos;re stored locally on your device.
          </p>
          {this.state.message ? (
            <p className="text-xs text-gray-400 font-mono mb-6 max-w-xs truncate">{this.state.message}</p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
