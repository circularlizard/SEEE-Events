'use client';

import { useState } from 'react';

interface ApiResponseViewerProps {
  data: unknown;
  error: Error | null;
  isLoading: boolean;
}

export function ApiResponseViewer({ data, error, isLoading }: ApiResponseViewerProps) {
  const [tab, setTab] = useState<'formatted' | 'raw'>('formatted');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Executing request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
        <h3 className="text-sm font-semibold text-destructive mb-2">Error</h3>
        <p className="text-sm text-destructive/90">{error.message}</p>
        {Boolean(error.cause) && (
          <pre className="mt-3 text-xs text-muted-foreground overflow-auto">
            {typeof error.cause === 'object' ? JSON.stringify(error.cause, null, 2) : String(error.cause)}
          </pre>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No response yet. Execute a request to see results.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('formatted')}
          className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'formatted'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Formatted
        </button>
        <button
          onClick={() => setTab('raw')}
          className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'raw'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Content */}
      {tab === 'formatted' ? (
        <FormattedView data={data} />
      ) : (
        <pre className="p-4 bg-muted rounded-md overflow-auto max-h-[600px] text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function FormattedView({ data }: { data: unknown }) {
  if (typeof data !== 'object' || data === null) {
    return (
      <div className="p-4 bg-muted rounded-md">
        <pre className="text-sm">{String(data)}</pre>
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Array ({data.length} {data.length === 1 ? 'item' : 'items'})
        </p>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {data.map((item, index) => (
            <div key={index} className="p-3 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground mb-2">Item {index + 1}</div>
              <ObjectView obj={item as Record<string, unknown>} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted rounded-md max-h-[600px] overflow-auto">
      <ObjectView obj={data as Record<string, unknown>} />
    </div>
  );
}

function ObjectView({ obj }: { obj: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {Object.entries(obj).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="text-sm font-medium min-w-[120px] text-muted-foreground">
            {key}:
          </span>
          <span className="text-sm flex-1 break-all">
            {typeof value === 'object' && value !== null ? (
              <details className="cursor-pointer">
                <summary className="text-primary">
                  {Array.isArray(value)
                    ? `Array(${value.length})`
                    : 'Object {...}'}
                </summary>
                <div className="ml-4 mt-2 pl-2 border-l-2">
                  <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                </div>
              </details>
            ) : (
              <span className={value === null ? 'text-muted-foreground italic' : ''}>
                {String(value)}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
