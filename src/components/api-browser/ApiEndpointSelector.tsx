'use client';

import { useState } from 'react';
import type { ApiEndpoint } from '@/types/api-browser';
import { API_ENDPOINTS, API_CATEGORIES } from '@/lib/api-endpoints';

interface ApiEndpointSelectorProps {
  value: ApiEndpoint | null;
  onChange: (endpoint: ApiEndpoint | null) => void;
}

export function ApiEndpointSelector({ value, onChange }: ApiEndpointSelectorProps) {
  const [category, setCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEndpoints = API_ENDPOINTS.filter((endpoint) => {
    const matchesCategory = category === 'all' || endpoint.category === category;
    const matchesSearch =
      searchQuery === '' ||
      endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {API_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search endpoints..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 border rounded-md bg-background"
      />

      {/* Endpoint List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEndpoints.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No endpoints found
          </p>
        ) : (
          filteredEndpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              onClick={() => onChange(endpoint)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                value?.id === endpoint.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{endpoint.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        endpoint.method === 'GET'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {endpoint.description}
                  </p>
                  <code className="text-xs text-muted-foreground mt-1 block truncate">
                    {endpoint.path}
                    {endpoint.action && `?action=${endpoint.action}`}
                  </code>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
