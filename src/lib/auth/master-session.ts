import { SignJWT, jwtVerify } from "jose";

export const MASTER_COOKIE = "qia_master";

const secret = () => {
  const value = process.env.MASTER_SESSION_SECRET;
  if (!value) throw new Error("MASTER_SESSION_SECRET não definido");
  return new TextEncoder().encode(value);
};

export async function createMasterToken(masterUserId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(masterUserId)
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyMasterToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
