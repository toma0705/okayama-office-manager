export const API_BASE_URL =
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api';

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
