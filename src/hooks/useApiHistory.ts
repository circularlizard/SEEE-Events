'use client';

import { useState, useEffect } from 'react';
import type { ApiRequestConfig } from '@/types/api-browser';

const STORAGE_KEY = 'seee-api-browser-history';
const MAX_HISTORY_ITEMS = 20;

interface UseApiHistoryResult {
  history: ApiRequestConfig[];
  addToHistory: (config: ApiRequestConfig) => void;
  clearHistory: () => void;
}

export function useApiHistory(): UseApiHistoryResult {
  const [history, setHistory] = useState<ApiRequestConfig[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error('[API History] Failed to load history:', err);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('[API History] Failed to save history:', err);
    }
  }, [history]);

  const addToHistory = (config: ApiRequestConfig) => {
    setHistory((prev) => {
      // Remove any existing identical request
      const filtered = prev.filter(
        (item) =>
          item.endpoint.id !== config.endpoint.id ||
          JSON.stringify(item.parameters) !== JSON.stringify(config.parameters)
      );

      // Add new request at the beginning
      const updated = [config, ...filtered];

      // Limit to MAX_HISTORY_ITEMS
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { history, addToHistory, clearHistory };
}
