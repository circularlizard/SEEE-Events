'use client';

import type { ApiEndpoint } from '@/types/api-browser';
import { useStore } from '@/store/use-store';
import { ApiExampleModal } from './ApiExampleModal';

interface ApiParameterFormProps {
  endpoint: ApiEndpoint;
  parameters: Record<string, string>;
  onChange: (parameters: Record<string, string>) => void;
}

export function ApiParameterForm({
  endpoint,
  parameters,
  onChange,
}: ApiParameterFormProps) {
  const currentSection = useStore((state) => state.currentSection);

  const handleChange = (name: string, value: string) => {
    onChange({
      ...parameters,
      [name]: value,
    });
  };

  // Auto-populate sectionid if not already set
  if (
    currentSection &&
    endpoint.parameters.some((p) => p.name === 'sectionid') &&
    !parameters.sectionid
  ) {
    setTimeout(() => handleChange('sectionid', currentSection.sectionId), 0);
  }

  return (
    <div className="space-y-4">
      {endpoint.parameters.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          This endpoint requires no parameters
        </p>
      ) : (
        endpoint.parameters.map((param) => (
          <div key={param.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {param.name}
              {param.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <p className="text-xs text-muted-foreground">{param.description}</p>

            {param.type === 'select' ? (
              <select
                value={parameters[param.name] || param.default || ''}
                onChange={(e) => handleChange(param.name, e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                required={param.required}
              >
                {!param.required && <option value="">-- Select --</option>}
                {param.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={param.type === 'number' ? 'number' : 'text'}
                value={parameters[param.name] || ''}
                onChange={(e) => handleChange(param.name, e.target.value)}
                placeholder={param.placeholder || param.default}
                className="w-full px-3 py-2 border rounded-md bg-background"
                required={param.required}
              />
            )}
          </div>
        ))
      )}

      {/* Request Preview */}
      <div className="mt-6 p-3 bg-muted rounded-md">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium">Request Preview:</p>
          <ApiExampleModal endpoint={endpoint} />
        </div>
        <code className="text-xs block break-all">
          {buildRequestUrl(endpoint, parameters)}
        </code>
      </div>
    </div>
  );
}

function buildRequestUrl(
  endpoint: ApiEndpoint,
  parameters: Record<string, string>
): string {
  // Replace path parameters
  let path = endpoint.path;
  Object.entries(parameters).forEach(([key, value]) => {
    path = path.replace(`{${key}}`, value);
  });

  // Build query string
  const queryParams = new URLSearchParams();
  if (endpoint.action) {
    queryParams.set('action', endpoint.action);
  }
  Object.entries(parameters).forEach(([key, value]) => {
    if (value && !endpoint.path.includes(`{${key}}`)) {
      queryParams.set(key, value);
    }
  });

  const query = queryParams.toString();
  return `/api/proxy${path}${query ? `?${query}` : ''}`;
}
