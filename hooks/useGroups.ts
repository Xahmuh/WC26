import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGroup,
  joinGroup,
  getJoinedGroups,
  getGroupLeaderboard,
} from '@/services/groups.service';

const JOINED_GROUPS_KEY = ['joinedGroups'];
const GROUP_LEADERBOARD_KEY = 'groupLeaderboard';

export function useJoinedGroups() {
  return useQuery({
    queryKey: JOINED_GROUPS_KEY,
    queryFn: getJoinedGroups,
  });
}

export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: [GROUP_LEADERBOARD_KEY, groupId],
    queryFn: () => getGroupLeaderboard(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOINED_GROUPS_KEY });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => joinGroup(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOINED_GROUPS_KEY });
    },
  });
}
