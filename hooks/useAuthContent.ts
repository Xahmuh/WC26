import { useQuery } from '@tanstack/react-query';

import { getAuthContent } from '@/services/auth-content.service';

export function useAuthContent() {
  return useQuery({
    queryKey: ['authContent'],
    queryFn: getAuthContent,
    staleTime: 5 * 60 * 1000,
  });
}
