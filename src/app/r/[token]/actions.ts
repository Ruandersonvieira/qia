"use server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { submitResponse, type SubmitInput } from "@/lib/public/submit-response";

export async function submitPublicResponse(publicToken: string, answersInput: SubmitInput["answers"]) {
  const jar = await cookies();
  let fp = jar.get("qia_fp")?.value;
  if (!fp) {
    fp = crypto.randomUUID();
    jar.set("qia_fp", fp, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  return submitResponse({ publicToken, fingerprint: fp, authUserId: session?.user.id, answers: answersInput });
}
