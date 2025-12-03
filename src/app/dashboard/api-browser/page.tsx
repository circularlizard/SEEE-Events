'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiEndpointSelector } from '@/components/api-browser/ApiEndpointSelector';
import { ApiParameterForm } from '@/components/api-browser/ApiParameterForm';
import { ApiResponseViewer } from '@/components/api-browser/ApiResponseViewer';
import { ApiHistory } from '@/components/api-browser/ApiHistory';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useApiHistory } from '@/hooks/useApiHistory';
import type { ApiEndpoint, ApiRequestConfig } from '@/types/api-browser';

export default function ApiBrowserPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const { execute, data, error, isLoading, reset } = useApiRequest();
  const { history, addToHistory, clearHistory } = useApiHistory();

  const handleExecuteRequest = async () => {
    if (!selectedEndpoint) return;

    const config: ApiRequestConfig = {
      endpoint: selectedEndpoint,
      parameters,
      timestamp: new Date().toISOString(),
    };

    await execute(config);
    addToHistory(config);
  };

  const handleLoadFromHistory = (config: ApiRequestConfig) => {
    setSelectedEndpoint(config.endpoint);
    setParameters(config.parameters);
    reset();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Browser</h1>
          <p className="text-muted-foreground mt-1">
            Explore and test OSM API endpoints
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Request Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Endpoint Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Endpoint</CardTitle>
              <CardDescription>
                Choose an OSM API endpoint to test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiEndpointSelector
                value={selectedEndpoint}
                onChange={setSelectedEndpoint}
              />
            </CardContent>
          </Card>

          {/* Parameters Form */}
          {selectedEndpoint && (
            <Card>
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
                <CardDescription>
                  Configure request parameters for {selectedEndpoint.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiParameterForm
                  endpoint={selectedEndpoint}
                  parameters={parameters}
                  onChange={setParameters}
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleExecuteRequest}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Executing...' : 'Execute Request'}
                  </Button>
                  <Button
                    onClick={reset}
                    variant="outline"
                    disabled={!data && !error}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Response Viewer */}
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Executing request...'
                  : data || error
                  ? 'Response received'
                  : 'Execute a request to see the response'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiResponseViewer
                data={data}
                error={error}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - History */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Request History</CardTitle>
                  <CardDescription>Recent API requests</CardDescription>
                </div>
                {history.length > 0 && (
                  <Button
                    onClick={clearHistory}
                    variant="ghost"
                    size="sm"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ApiHistory
                history={history}
                onLoad={handleLoadFromHistory}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
