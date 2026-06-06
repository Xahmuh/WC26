import { supabase } from '@/lib/supabase';
import type { CompetitionGroup, GroupMember } from '@/types';

/**
 * Generates a random uppercase 6-character alphanumeric invite code.
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new competition group (mini-league).
 * The current user is automatically added as a member by the DB trigger.
 */
export async function createGroup(name: string): Promise<CompetitionGroup> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) throw new Error('Not authenticated');
  const user = authData.user;

  const nameTrim = name.trim();
  if (nameTrim.length < 3) {
    throw new Error('Group name must be at least 3 characters.');
  }

  // Attempt to generate a unique code and insert
  let attempts = 0;
  while (attempts < 5) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from('competition_groups')
      .insert({
        name: nameTrim,
        code: code,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as CompetitionGroup;
    }

    // If it's a unique constraint error on the code, try again
    if (error && error.message.includes('unique constraint')) {
      attempts++;
      continue;
    }

    throw new Error(error?.message || 'Failed to create group');
  }

  throw new Error('Failed to generate a unique invite code. Please try again.');
}

/**
 * Joins a competition group using an invite code.
 */
export async function joinGroup(code: string): Promise<CompetitionGroup> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) throw new Error('Not authenticated');
  const user = authData.user;

  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length === 0) {
    throw new Error('Invite code is required.');
  }

  // 1. Find the group by code
  const { data: group, error: groupError } = await supabase
    .from('competition_groups')
    .select('*')
    .eq('code', cleanCode)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group) throw new Error('Invalid invite code. Group not found.');

  // 2. Insert member row
  const { error: joinError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
    });

  if (joinError) {
    if (joinError.message.includes('duplicate key')) {
      throw new Error('You are already a member of this group.');
    }
    throw new Error(joinError.message);
  }

  return group as CompetitionGroup;
}

/**
 * Fetches the competition groups joined by the current user.
 */
export async function getJoinedGroups(): Promise<(CompetitionGroup & { memberCount: number })[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return [];
  const user = authData.user;

  // Get joined group ids
  const { data: membershipData, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id);

  if (membershipError) throw new Error(membershipError.message);
  if (!membershipData || membershipData.length === 0) return [];

  const groupIds = membershipData.map((m) => m.group_id);

  // Fetch group details along with membership counts
  const { data: groupsData, error: groupsError } = await supabase
    .from('competition_groups')
    .select(`
      id,
      name,
      code,
      created_by,
      created_at,
      group_members(user_id)
    `)
    .in('id', groupIds);

  if (groupsError) throw new Error(groupsError.message);

  return (groupsData || []).map((group) => ({
    id: group.id,
    name: group.name,
    code: group.code,
    created_by: group.created_by,
    created_at: group.created_at,
    memberCount: group.group_members?.length || 0,
  }));
}

/**
 * Fetches the group details and list of members with their current score points.
 * Sorts them by points to form a leaderboard ranking.
 */
export async function getGroupLeaderboard(
  groupId: string
): Promise<{ group: CompetitionGroup; members: GroupMember[] }> {
  // 1. Fetch group details
  const { data: group, error: groupError } = await supabase
    .from('competition_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group) throw new Error('Group not found');

  // 2. Fetch group members with user profiles
  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select(`
      group_id,
      user_id,
      joined_at,
        user:users(display_name, username, avatar_url, total_points)
    `)
    .eq('group_id', groupId);

  if (membersError) throw new Error(membersError.message);

  // Map and sort members by points
  const members: GroupMember[] = (membersData || [])
    .map((m: any) => ({
      group_id: m.group_id,
      user_id: m.user_id,
      joined_at: m.joined_at,
      display_name: m.user?.username || m.user?.display_name || 'Player',
      username: m.user?.username || null,
      avatar_url: m.user?.avatar_url || null,
      total_points: m.user?.total_points || 0,
    }))
    .sort((a, b) => b.total_points - a.total_points);

  // Add rank index
  let currentRank = 1;
  for (let i = 0; i < members.length; i++) {
    const currentMember = members[i];
    const prevMember = members[i - 1];
    if (i > 0 && currentMember && prevMember && currentMember.total_points < prevMember.total_points) {
      currentRank = i + 1;
    }
    if (currentMember) {
      currentMember.rank = currentRank;
    }
  }

  return {
    group: group as CompetitionGroup,
    members: members,
  };
}
