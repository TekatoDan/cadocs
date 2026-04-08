"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";

export async function getTeamMessages(
  teamId: string
): Promise<ChatMessage[]> {
  await getAuthUser();

  const messages = await prisma.message.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return messages.map((m) => ({
    id: m.id,
    team_id: m.teamId,
    user_id: m.userId || "",
    user_email: m.userEmail,
    content: m.content,
    created_at: m.createdAt.toISOString(),
  }));
}

export async function sendMessage(
  teamId: string,
  userId: string,
  userEmail: string,
  content: string
): Promise<void> {
  await getAuthUser();

  await prisma.message.create({
    data: { teamId, userId, userEmail, content },
  });
}
