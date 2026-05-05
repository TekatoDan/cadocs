"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyName } from "@/app/actions/profile";

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: getMyProfile,
    enabled: !!userId,
  });
}

export function useUpdateMyName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fullName: string) => updateMyName(fullName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
    },
  });
}
