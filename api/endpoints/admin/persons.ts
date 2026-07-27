import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CreatePersonPayload,
  Person,
  QueryPersonsParams,
  UpdatePersonPayload,
} from '@/types/contributors';

export interface PersonListResponse {
  items: Person[];
  total: number;
  limit: number;
  offset: number;
}

export const personsApi = {
  async list(params?: QueryPersonsParams): Promise<PersonListResponse> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.role) query.set('role', params.role);
    if (params?.type) query.set('type', params.type);
    if (params?.language) query.set('language', params.language);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const queryString = query.toString();
    return httpGetAuth<PersonListResponse>(
      `/admin/persons${queryString ? `?${queryString}` : ''}`,
      {
        requireAuth: true,
      }
    );
  },

  async search(q: string): Promise<PersonListResponse> {
    return httpGetAuth<PersonListResponse>(`/admin/persons/search?q=${encodeURIComponent(q)}`, {
      requireAuth: true,
    });
  },

  async getById(id: string): Promise<Person> {
    return httpGetAuth<Person>(`/admin/persons/${id}`, { requireAuth: true });
  },

  async create(payload: CreatePersonPayload): Promise<Person> {
    return httpPostAuth<Person>('/admin/persons', payload, { requireAuth: true });
  },

  async update(id: string, payload: UpdatePersonPayload): Promise<Person> {
    return httpPatchAuth<Person>(`/admin/persons/${id}`, payload, { requireAuth: true });
  },
};
