'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in dev; would send to Sentry/PostHog in prod
    if (process.env.NODE_ENV === 'development') {
      console.error('[TravelPanel] Render error:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultFallback onReset={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-8 text-center">
      <div className="text-5xl mb-5">😵</div>
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-[260px]">
        TravelPanel hit an unexpected error. Your saved clips are safe.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <button
          type="button"
          onClick={onReset}
          className="bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Reload app
        </button>
      </div>
    </div>
  );
}
