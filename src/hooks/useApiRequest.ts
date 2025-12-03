'use client';

import { useState } from 'react';
import type { ApiRequestConfig } from '@/types/api-browser';

interface UseApiRequestResult {
  execute: (config: ApiRequestConfig) => Promise<void>;
  data: unknown;
  error: Error | null;
  isLoading: boolean;
  meta: { proxyUrl?: string; upstreamUrl?: string; status?: number; headers?: Record<string, string> } | null;
  reset: () => void;
}

export function useApiRequest(): UseApiRequestResult {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meta, setMeta] = useState<UseApiRequestResult['meta']>(null);

  const execute = async (config: ApiRequestConfig) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Build the request URL
      let path = config.endpoint.path;
      
      // Replace path parameters (e.g., {eventid})
      Object.entries(config.parameters).forEach(([key, value]) => {
        path = path.replace(`{${key}}`, value);
      });

      // Build query string
      const queryParams = new URLSearchParams();
      if (config.endpoint.action) {
        queryParams.set('action', config.endpoint.action);
      }
      
      // Add parameters that aren't in the path
      Object.entries(config.parameters).forEach(([key, value]) => {
        if (value && !config.endpoint.path.includes(`{${key}}`)) {
          queryParams.set(key, value);
        }
      });

      const query = queryParams.toString();
      const url = `/api/proxy${path}${query ? `?${query}` : ''}`;

      console.log('[API Browser] Executing request:', url);

      const response = await fetch(url, {
        method: config.endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Request failed with status ${response.status}: ${errorText}`
        );
      }

      const responseData = await response.json();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      setMeta({ proxyUrl: url, upstreamUrl: headers['x-upstream-url'], status: response.status, headers });
      setData(responseData);
    } catch (err) {
      console.error('[API Browser] Request failed:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('An unknown error occurred')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setMeta(null);
  };

  return { execute, data, error, isLoading, meta, reset };
}
