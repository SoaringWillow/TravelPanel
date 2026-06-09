'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, info.componentStack);
      // Re-throw in dev so the React error overlay still works
      throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh', padding: '2rem',
            background: '#f9fafb', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 20 }}>🗺</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, maxWidth: 280, lineHeight: 1.5 }}>
            TravelPanel hit an unexpected error. Your saved clips are safe.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#6366f1', color: 'white', border: 'none',
              borderRadius: 12, padding: '12px 28px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload TravelPanel
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <p style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', maxWidth: 320, wordBreak: 'break-all' }}>
              {this.state.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
