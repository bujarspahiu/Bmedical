const rawApiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api/physio';

export const apiEndpoint = rawApiEndpoint.replace(/\/+$/, '');
export const apiToken = import.meta.env.VITE_API_TOKEN || '';
