/**
 * Central API Configuration for CoBuy Frontend.
 * In development: defaults to 'http://localhost:5000/api'.
 * In production (Netlify): uses the VITE_API_BASE environment variable.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default API_BASE;
