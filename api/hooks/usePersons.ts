import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePersonPayload,
  QueryPersonsParams,
  UpdatePersonPayload,
} from '@/types/contributors';
import { personsApi } from '../endpoints/admin/persons';

export function usePersons(params?: QueryPersonsParams) {
  return useQuery({
    queryKey: ['admin', 'persons', params],
    queryFn: () => personsApi.list(params),
  });
}

export function usePersonSearch(q: string) {
  return useQuery({
    queryKey: ['admin', 'persons', 'search', q],
    queryFn: () => personsApi.search(q),
    enabled: q.trim().length >= 2,
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: ['admin', 'persons', id],
    queryFn: () => personsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePersonPayload) => personsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'persons'] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePersonPayload }) =>
      personsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'persons'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'persons', variables.id] });
    },
  });
}
