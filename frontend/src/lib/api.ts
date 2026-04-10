import { supabase, getCachedSession, waitForSession } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private async getHeaders(): Promise<Record<string, string>> {
    // Wait for Supabase INITIAL_SESSION before reading the session.
    // This is instant after the first page load; on the very first call it
    // awaits Supabase initialization (including any token refresh on startup).
    // 10-second safety timeout guards against a broken Supabase init.
    await Promise.race([
      waitForSession(),
      new Promise<void>(resolve => setTimeout(resolve, 10000)),
    ]);

    const session = getCachedSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      console.log('No session found');
    }

    return headers;
  }

  // All HTTP requests go through this so every call has a hard timeout.
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async get(endpoint: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithTimeout(`${API_URL}${endpoint}`, { headers });
    return this.handleResponse(response, () => this.get(endpoint));
  }

  async post(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const url = `${API_URL}${endpoint}`;

    console.log('=== API POST ===');
    console.log('URL:', url);
    console.log('Auth token present:', !!headers['Authorization']);
    console.log('Body:', JSON.stringify(data));

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);
      console.log('Response OK:', response.ok);

      return this.handleResponse(response, () => this.post(endpoint, data));
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async put(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response, () => this.put(endpoint, data));
  }

  async patch(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response, () => this.patch(endpoint, data));
  }

  async delete(endpoint: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response, () => this.delete(endpoint));
  }

  private async handleResponse(response: Response, retry?: () => Promise<any>): Promise<any> {
    if (response.status === 401) {
      // By the time we reach here, INITIAL_SESSION has already fired (getHeaders
      // waited for it). A 401 means the stored token was rejected — either it
      // expired mid-request or was revoked. Call getSession() once to let
      // Supabase auto-refresh; this is rare so the occasional lock wait is fine.
      const { data: { session } } = await supabase.auth.getSession();
      if (session && retry) {
        return retry();
      }
      // No valid session — sign out; onAuthStateChange(SIGNED_OUT) handles redirect
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let error: any;
      try {
        const text = await response.text();
        console.error('API Error Response:', text);
        console.error('Status:', response.status);

        try {
          error = JSON.parse(text);
        } catch {
          error = { error: text };
        }
      } catch (e) {
        console.error('Failed to read error response:', e);
        error = { error: 'Unknown error occurred' };
      }

      throw new Error(error.error || 'An error occurred');
    }
    if (response.status === 204) return null;
    return response.json();
  }
}

export const api = new ApiClient();
