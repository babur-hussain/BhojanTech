import { API_BASE_URL } from '../constants/api';

let _token: string | null = null;

export function setAuthToken(token: string | null) {
    _token = token;
}

export function getAuthToken(): string | null {
    return _token;
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

export async function api<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (_token) {
        reqHeaders['Authorization'] = `Bearer ${_token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `API Error ${res.status}`);
    }

    return res.json();
}

// Stream helper for AI chat (SSE)
export async function streamApi(
    endpoint: string,
    body: any,
    onChunk: (text: string) => void,
): Promise<void> {
    const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (_token) {
        reqHeaders['Authorization'] = `Bearer ${_token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(body),
    });

    const text = await res.text();
    const lines = text.split('\n\n');
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) onChunk(parsed.text);
                if (parsed.error) onChunk(`\nError: ${parsed.error}`);
            } catch { }
        }
    }
}
