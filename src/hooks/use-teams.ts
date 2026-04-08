"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDefaultTeam,
  getTeamRole,
  getTeamMembers,
  updateTeamMemberRole,
  removeTeamMember,
  inviteUserToTeam,
  getDiscoveredUsers,
} from "@/app/actions/teams";

export function useDefaultTeam(userId: string | undefined) {
  return useQuery({
    queryKey: ["team", "default", userId],
    queryFn: () => getDefaultTeam(userId!),
    enabled: !!userId,
  });
}

export function useTeamRole(
  teamId: string | null,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ["team", "role", teamId, userId],
    queryFn: () => getTeamRole(teamId!, userId!),
    enabled: !!teamId && !!userId,
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team", "members", teamId],
    queryFn: () => getTeamMembers(teamId!),
    enabled: !!teamId,
  });
}

export function useDiscoveredUsers(teamId: string | null) {
  return useQuery({
    queryKey: ["team", "discovered", teamId],
    queryFn: () => getDiscoveredUsers(teamId!),
    enabled: !!teamId,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      newRole,
    }: {
      memberId: string;
      newRole: string;
    }) => updateTeamMemberRole(memberId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      userId,
    }: {
      teamId: string;
      userId: string;
    }) => inviteUserToTeam(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
