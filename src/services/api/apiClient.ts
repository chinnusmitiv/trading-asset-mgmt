/**
 * API Client for Google Apps Script Web App Gateway
 */

import { ApiResponse } from '../../types';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public generateRequestId(): string {
    return 'REQ-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }

  public async request<T = any>(
    action: string,
    payload: any = {},
    customRequestId?: string
  ): Promise<ApiResponse<T>> {
    const requestId = customRequestId || this.generateRequestId();

    const requestBody = {
      action,
      payload,
      token: this.token,
      requestId
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: `Network response failed with status ${response.status}`,
          errorCode: 'NETWORK_ERROR',
          requestId
        };
      }

      const json: ApiResponse<T> = await response.json();
      return json;
    } catch (err: any) {
      return {
        success: false,
        data: null,
        message: err.message || 'Unable to connect to Google Apps Script API',
        errorCode: 'CLIENT_FETCH_ERROR',
        requestId
      };
    }
  }
}
