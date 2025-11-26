import React from 'react'

type State = { error: Error | null }

export default class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: any) {
    // keep console logging so errors show up in browser devtools and CI logs
    // Do not log any secrets here — just the stack/message
    // eslint-disable-next-line no-console
    console.error('Unhandled render error', { message: error?.message, stack: error?.stack, info })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-center text-sm text-red-800 bg-red-50 min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">An error occurred</h2>
          <div className="max-w-2xl text-left bg-white shadow rounded p-4 w-full">
            <strong>Message:</strong>
            <pre className="whitespace-pre-wrap break-words my-2 text-xs">{this.state.error.message}</pre>
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="whitespace-pre-wrap break-words my-2 text-xs">{String(this.state.error.stack)}</pre>
            </details>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
