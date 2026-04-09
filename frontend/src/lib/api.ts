import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private async getSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    // Proactively refresh if token expires within the next 60 seconds
    const expiresAt = session.expires_at ?? 0; // Unix timestamp (seconds)
    const nowSecs = Math.floor(Date.now() / 1000);
    if (expiresAt - nowSecs < 60) {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      return refreshed;
    }

    return session;
  }

  private async getHeaders() {
    const session = await this.getSession();

    if (!session?.access_token) {
      console.log('No session found');
      return {
        'Content-Type': 'application/json',
      };
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  async get(endpoint: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, { headers });
    return this.handleResponse(response, () => this.get(endpoint));
  }

  async post(endpoint: string, data: any) {
    const headers = await this.getHeaders();
    const url = `${API_URL}${endpoint}`;

    console.log('=== API POST ===');
    console.log('URL:', url);
    console.log('Auth token present:', !!headers['Authorization']);
    console.log('Body:', JSON.stringify(data));

    try {
      const response = await fetch(url, {
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

  async put(endpoint: string, data: any) {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response, () => this.put(endpoint, data));
  }

  async delete(endpoint: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response, () => this.delete(endpoint));
  }

  private async handleResponse(response: Response, retry?: () => Promise<any>): Promise<any> {
    // Token rejected by backend — try to refresh once, then retry the request
    if (response.status === 401) {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session && retry) {
        return retry();
      }
      // Refresh failed — force re-login
      await supabase.auth.signOut();
      window.location.href = '/login';
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
