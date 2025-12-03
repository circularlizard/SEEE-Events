'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ApiEndpoint } from '@/types/api-browser';

interface ApiExampleModalProps {
  endpoint: ApiEndpoint;
}

export function ApiExampleModal({ endpoint }: ApiExampleModalProps) {
  const [example, setExample] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExample = async () => {
    if (!endpoint.exampleResponse) {
      setError('No example available for this endpoint');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load from mocks/data folder
      const response = await fetch(`/mocks/data/${endpoint.exampleResponse}`);
      if (!response.ok) {
        throw new Error('Failed to load example');
      }
      const text = await response.text();
      setExample(text);
    } catch (err) {
      console.error('[API Example] Failed to load:', err);
      setError('Failed to load example response');
    } finally {
      setIsLoading(false);
    }
  };

  if (!endpoint.exampleResponse) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={loadExample}>
          View Example
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Example Response: {endpoint.name}</DialogTitle>
          <DialogDescription>
            Sample response data from {endpoint.exampleResponse}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : example ? (
            <pre className="p-4 bg-muted rounded-md overflow-auto text-xs">
              {example}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              Click to load example
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
