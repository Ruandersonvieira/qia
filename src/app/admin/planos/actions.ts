"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { requireMaster } from "@/lib/auth/require-master";

export async function createPlan(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const monthlyResponseLimit = Number(formData.get("monthlyResponseLimit"));
  const priceMonthly = Number(formData.get("priceMonthly"));
  const priceAnnual = Number(formData.get("priceAnnual"));
  if (!name) return { error: "Nome é obrigatório" };
  if (!Number.isFinite(monthlyResponseLimit) || monthlyResponseLimit < 1) {
    return { error: "Limite de respostas deve ser um número maior ou igual a 1" };
  }
  if (!Number.isFinite(priceMonthly) || priceMonthly < 0 || !Number.isFinite(priceAnnual) || priceAnnual < 0) {
    return { error: "Preços mensal e anual devem ser números válidos" };
  }

  await db.insert(plans).values({
    name,
    monthlyResponseLimit: Math.floor(monthlyResponseLimit),
    priceMonthly: String(priceMonthly),
    priceAnnual: String(priceAnnual),
  });

  revalidatePath("/admin/planos");
  return {};
}
