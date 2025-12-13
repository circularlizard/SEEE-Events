"use client";

import { useMemo } from "react";
import { useDataSourceProgress, type DataSourceProgress } from "@/store/use-store";

/**
 * Unified Data Loading Banner
 * 
 * Displays loading progress for all data sources (members, events, etc.)
 * Shows a combined progress bar when any data source is loading.
 * Remains visible with "All data loaded" when complete.
 */
export function DataLoadingBanner() {
  const dataSourceProgress = useDataSourceProgress();

  // Calculate overall progress across all data sources
  const { sources, totalItems, completedItems, isLoading, isComplete, hasError, errorMessages } = useMemo(() => {
    const sources = Object.values(dataSourceProgress) as DataSourceProgress[];
    
    // If no sources registered yet, nothing to show
    if (sources.length === 0) {
      return {
        sources: [],
        totalItems: 0,
        completedItems: 0,
        isLoading: false,
        isComplete: false,
        hasError: false,
        errorMessages: [] as string[],
      };
    }

    const totalItems = sources.reduce((sum, s) => sum + s.total, 0);
    const completedItems = sources.reduce((sum, s) => sum + s.completed, 0);
    const isLoading = sources.some(s => s.state === 'loading');
    const isComplete = sources.length > 0 && sources.every(s => s.state === 'complete');
    const hasError = sources.some(s => s.state === 'error');
    const errorMessages = sources
      .filter(s => s.state === 'error' && s.error)
      .map(s => `${s.label}: ${s.error}`);

    return { sources, totalItems, completedItems, isLoading, isComplete, hasError, errorMessages };
  }, [dataSourceProgress]);

  // Hide only when we have no data sources registered (idle state)
  if (sources.length === 0) {
    return null;
  }

  const percentage = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : isComplete ? 100 : 0;

  // Build status message
  const getStatusMessage = () => {
    if (hasError) {
      return errorMessages.length > 0 ? errorMessages[0] : "Error loading data";
    }
    if (isComplete) {
      return "All data loaded";
    }
    // Show the phase of the currently loading source
    const loadingSource = sources.find(s => s.state === 'loading');
    if (loadingSource) {
      return loadingSource.phase;
    }
    return "Loading...";
  };

  // Build source summary (e.g., "Members: 25, Events: 12")
  const getSourceSummary = () => {
    return sources
      .filter(s => s.state === 'complete' || s.state === 'loading')
      .map(s => {
        if (s.state === 'complete') {
          return `${s.label}: ${s.total}`;
        }
        return `${s.label}: ${s.completed}/${s.total}`;
      })
      .join(' • ');
  };

  return (
    <div
      className={`border-b ${
        hasError
          ? "bg-destructive/10 border-destructive"
          : isComplete
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          : "bg-muted/40 border-border"
      }`}
    >
      <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-muted-foreground">
          <span className="font-medium text-foreground flex items-center gap-2">
            {isLoading && (
              <span
                className="inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-label="Loading"
              />
            )}
            {isComplete && (
              <svg
                className="h-4 w-4 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {hasError && (
              <svg
                className="h-4 w-4 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            Data Loading
          </span>
          <span className={hasError ? "text-destructive" : isComplete ? "text-green-700 dark:text-green-400" : ""}>
            {getStatusMessage()}
          </span>
        </div>
        <div className="flex items-center gap-3 min-w-[180px]">
          <div className="hidden md:block text-muted-foreground text-xs">
            {getSourceSummary()}
          </div>
          <div
            className="w-32 h-1.5 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Data loading progress"
          >
            <div
              className={`h-full transition-all duration-300 ${
                hasError
                  ? "bg-destructive"
                  : isComplete
                  ? "bg-green-600 dark:bg-green-500"
                  : "bg-primary"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
