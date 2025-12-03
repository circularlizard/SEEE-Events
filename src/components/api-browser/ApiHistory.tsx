'use client';

import type { ApiRequestConfig } from '@/types/api-browser';
import { formatDistanceToNow } from 'date-fns';

interface ApiHistoryProps {
  history: ApiRequestConfig[];
  onLoad: (config: ApiRequestConfig) => void;
}

export function ApiHistory({ history, onLoad }: ApiHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          No requests yet. Execute an API request to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((item, index) => (
        <button
          key={index}
          onClick={() => onLoad(item)}
          className="w-full text-left p-3 rounded-md border border-border hover:bg-accent transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {item.endpoint.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                    item.endpoint.method === 'GET'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  }`}
                >
                  {item.endpoint.method}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
              {Object.keys(item.parameters).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(item.parameters).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary rounded text-xs"
                    >
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono">{value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
