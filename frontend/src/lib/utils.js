import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Wrapper around fetch that automatically injects the JWT Bearer token.
 * Use this for all authenticated API calls.
 */
export function authFetch(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = { ...(options.headers || {}) };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}
