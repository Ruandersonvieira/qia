import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        // só cria auth user se existir convite pendente com este email
        before: async (user) => {
          const invited = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });
          if (!invited || invited.status !== "invited") {
            throw new Error("Cadastro permitido apenas por convite");
          }
          return { data: user };
        },
      },
    },
  },
});
