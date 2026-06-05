import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GroupCard } from '@/components/ui/GroupCard';
import { useJoinedGroups, useCreateGroup, useJoinGroup } from '@/hooks/useGroups';

export default function GroupsDashboard(): React.JSX.Element {
  const router = useRouter();

  const joinedGroupsQuery = useJoinedGroups();
  const createGroupMutation = useCreateGroup();
  const joinGroupMutation = useJoinGroup();

  const [activeTab, setActiveTab] = useState<'list' | 'manage'>('list');
  
  // Forms State
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleCreateGroup = () => {
    const name = createName.trim();
    if (name.length < 3) {
      Alert.alert('Error', 'Group name must be at least 3 characters.');
      return;
    }

    createGroupMutation.mutate(name, {
      onSuccess: (newGroup) => {
        setCreateName('');
        Alert.alert(
          'Success',
          `Group "${newGroup.name}" created successfully!\nInvite Code: ${newGroup.code}`,
          [
            {
              text: 'Go to Group',
              onPress: () => router.push(`/groups/${newGroup.id}` as any),
            },
            {
              text: 'OK',
              onPress: () => setActiveTab('list'),
            },
          ]
        );
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to create group.');
      },
    });
  };

  const handleJoinGroup = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 0) {
      Alert.alert('Error', 'Invite code is required.');
      return;
    }

    joinGroupMutation.mutate(code, {
      onSuccess: (joinedGroup) => {
        setJoinCode('');
        Alert.alert(
          'Success',
          `Successfully joined "${joinedGroup.name}"!`,
          [
            {
              text: 'View Group',
              onPress: () => router.push(`/groups/${joinedGroup.id}` as any),
            },
          ]
        );
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to join group.');
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-bgBorder">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-xl text-accent font-bold">←</Text>
        </Pressable>
        <Text className="text-xl font-bold text-textPrimary">Mini-Leagues</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-bgBorder">
        <Pressable
          onPress={() => setActiveTab('list')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'list' ? 'border-accent' : 'border-transparent'
          }`}
        >
          <Text className={`font-bold ${activeTab === 'list' ? 'text-accent' : 'text-textSecondary'}`}>
            My Leagues
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('manage')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'manage' ? 'border-accent' : 'border-transparent'
          }`}
        >
          <Text className={`font-bold ${activeTab === 'manage' ? 'text-accent' : 'text-textSecondary'}`}>
            Create / Join
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6">
        {/* List Tab */}
        {activeTab === 'list' && (
          <View className="gap-4">
            {joinedGroupsQuery.isLoading ? (
              <LoadingSpinner label="Loading mini-leagues..." />
            ) : joinedGroupsQuery.data?.length === 0 ? (
              <View className="items-center gap-4 py-10">
                <Text className="text-5xl">🏆</Text>
                <Text className="text-lg font-bold text-textPrimary text-center">
                  Compete in Private Mini-Leagues
                </Text>
                <Text className="text-sm text-textSecondary text-center px-6">
                  Create a custom group of competition for your coworkers, friends, or family.
                  Or enter an invite code to join an existing group.
                </Text>
                <Button label="Join or Create a League" onPress={() => setActiveTab('manage')} className="mt-2" />
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-sm text-textSecondary">
                  Select a mini-league to view its leaderboard standings and invite code.
                </Text>
                {joinedGroupsQuery.data?.map((g) => (
                  <GroupCard
                    key={g.id}
                    name={g.name}
                    code={g.code}
                    memberCount={g.memberCount}
                    onPress={() => router.push(`/groups/${g.id}` as any)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <View className="gap-6">
            {/* Join Group */}
            <Card className="p-5 border border-bgBorder bg-bgSurface2 gap-4">
              <View className="gap-1">
                <Text className="text-base font-bold text-textPrimary">Join a Mini-League</Text>
                <Text className="text-xs text-textSecondary">
                  Enter the unique 6-character code shared by another user.
                </Text>
              </View>

              <View className="gap-1.5">
                <TextInput
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="e.g. WX90PZ"
                  placeholderTextColor={Theme.colors.textTertiary}
                  autoCapitalize="characters"
                  maxLength={10}
                  className="h-12 rounded-xl border border-bgBorder bg-bgSurface1 px-4 text-center text-lg font-extrabold tracking-widest text-accent uppercase"
                />
              </View>

              <Button
                label="Join League"
                onPress={handleJoinGroup}
                loading={joinGroupMutation.isPending}
              />
            </Card>

            {/* Create Group */}
            <Card className="p-5 border border-bgBorder bg-bgSurface2 gap-4">
              <View className="gap-1">
                <Text className="text-base font-bold text-textPrimary">Create a Mini-League</Text>
                <Text className="text-xs text-textSecondary">
                  Create a new group of competition. You will receive an invite code to share.
                </Text>
              </View>

              <View className="gap-1.5">
                <TextInput
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder="e.g. Friends Tournament League"
                  placeholderTextColor={Theme.colors.textTertiary}
                  className="h-12 rounded-xl border border-bgBorder bg-bgSurface1 px-4 text-base text-textPrimary"
                />
              </View>

              <Button
                label="Create League"
                onPress={handleCreateGroup}
                loading={createGroupMutation.isPending}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
