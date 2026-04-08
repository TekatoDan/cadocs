"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser, ensureUserProfile } from "@/lib/auth";
import type { TeamMember } from "@/lib/types";

export async function getTeamRole(
  teamId: string,
  userId: string
): Promise<string | null> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return member?.role || null;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, avatarUrl: true },
      },
    },
  });

  return members.map((m) => ({
    id: m.id,
    role: m.role,
    user_id: m.userId,
    users: m.user
      ? {
          id: m.user.id,
          email: m.user.email,
          full_name: m.user.fullName,
          avatar_url: m.user.avatarUrl,
        }
      : null,
  }));
}

export async function updateTeamMemberRole(
  memberId: string,
  newRole: string
): Promise<void> {
  await getAuthUser();
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });
}

export async function removeTeamMember(memberId: string): Promise<void> {
  await getAuthUser();
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { role: "rejected" },
  });
}

export async function getDefaultTeam(userId: string) {
  // Ensure user profile exists in public.users before any team operations
  await ensureUserProfile();

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true, description: true, createdAt: true, createdBy: true } } },
  });

  if (memberships.length > 0) {
    memberships.sort((a, b) => {
      if (a.role !== "owner" && b.role === "owner") return -1;
      if (a.role === "owner" && b.role !== "owner") return 1;
      return a.team.createdAt.getTime() - b.team.createdAt.getTime();
    });

    const team = memberships[0].team;
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      created_by: team.createdBy,
      created_at: team.createdAt.toISOString(),
    };
  }

  // No memberships — find or create the primary team
  let primaryTeam = await prisma.team.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!primaryTeam) {
    primaryTeam = await prisma.team.create({
      data: {
        name: "CADOcs",
        description: "Central Document Repository",
        createdBy: userId,
      },
    });

    await prisma.teamMember.create({
      data: { teamId: primaryTeam.id, userId, role: "owner" },
    });
  } else {
    await prisma.teamMember.create({
      data: { teamId: primaryTeam.id, userId, role: "viewer" },
    });
  }

  return {
    id: primaryTeam.id,
    name: primaryTeam.name,
    description: primaryTeam.description,
    created_by: primaryTeam.createdBy,
    created_at: primaryTeam.createdAt.toISOString(),
  };
}

export async function getDiscoveredUsers(teamId: string) {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);

  const users = await prisma.user.findMany({
    where: { id: { notIn: memberIds } },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    avatar_url: u.avatarUrl,
  }));
}

export async function inviteUserToTeam(
  teamId: string,
  userId: string
): Promise<void> {
  await getAuthUser();

  // Remove from other teams
  await prisma.teamMember.deleteMany({
    where: { userId, teamId: { not: teamId } },
  });

  await prisma.teamMember.create({
    data: { teamId, userId, role: "viewer" },
  });
}
