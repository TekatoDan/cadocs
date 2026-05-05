"use server";

import { prisma } from "@/lib/prisma";
import { ensureUserProfile, getAuthUser } from "@/lib/auth";

export async function getMyProfile() {
  const authUser = await ensureUserProfile();

  const profile = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found.");
  }

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
  };
}

export async function updateMyName(fullName: string) {
  const authUser = await getAuthUser();
  const normalizedName = fullName.trim();

  if (!normalizedName) {
    throw new Error("Name cannot be empty.");
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      fullName: normalizedName,
    },
  });

  return { full_name: normalizedName };
}
