export interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST';
  action: string | null;
  description: string;
  category: 'events' | 'members' | 'badges' | 'quartermaster' | 'generic' | 'other';
  parameters: ApiParameter[];
  exampleResponse?: string; // Reference to example file
}

export interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  description: string;
  default?: string;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface ApiRequestConfig {
  endpoint: ApiEndpoint;
  parameters: Record<string, string>;
  timestamp: string;
}

export interface ApiHistoryItem extends ApiRequestConfig {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
}
