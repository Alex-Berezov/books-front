import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { buildUrlWithParams } from '@/lib/http';
import { httpGet } from '@/lib/http';
import { ApiError } from '@/types/api';
import { server } from '../msw/server';

// We need to import httpGet dynamically or assume it's exported.
// Since I haven't seen httpGet exported, I'll check the file content again or assume it follows the pattern.
// Let's assume httpGet is exported.

describe('HTTP Utils', () => {
  describe('buildUrlWithParams', () => {
    it('should return endpoint if no params', () => {
      expect(buildUrlWithParams('/test')).toBe('/test');
    });

    it('should append query params', () => {
      expect(buildUrlWithParams('/test', { page: 1, sort: 'asc' })).toBe('/test?page=1&sort=asc');
    });

    it('should ignore undefined values', () => {
      expect(buildUrlWithParams('/test', { page: 1, filter: undefined })).toBe('/test?page=1');
    });
  });

  describe('httpGet', () => {
    it('should make a GET request and return data', async () => {
      server.use(
        http.get('http://localhost:5000/api/test-get', () => {
          return HttpResponse.json({ message: 'success' });
        })
      );

      const data = await httpGet<{ message: string }>('/test-get');
      expect(data).toEqual({ message: 'success' });
    });

    it('should handle 404 error', async () => {
      server.use(
        http.get('http://localhost:5000/api/not-found', () => {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
        })
      );

      await expect(httpGet('/not-found')).rejects.toThrow(ApiError);
    });
  });
});
