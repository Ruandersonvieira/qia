"use server";
import { requireGestor } from "@/lib/auth/session";
import { sendChatMessage } from "@/lib/assistant/chat";

export async function sendAssistantMessage(
  cycleId: string,
  content: string
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const { clientId } = await requireGestor();
  try {
    const { reply } = await sendChatMessage({ clientId, cycleId, content });
    return { ok: true, reply };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao falar com o assistente" };
  }
}
