const BASE_URL = process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3";

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY ?? "",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Asaas API ${path} falhou (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export type AsaasCustomer = { id: string; name: string; email: string | null };

export async function createAsaasCustomer(input: { name: string; email: string; cpfCnpj: string }): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", { method: "POST", body: JSON.stringify(input) });
}

export type AsaasCheckout = { id: string; link: string; status: string };

export async function createAsaasCheckout(input: {
  customerData: { name: string; email: string; cpfCnpj: string; phone?: string };
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  externalReference: string;
  successUrl: string;
}): Promise<AsaasCheckout> {
  return asaasFetch<AsaasCheckout>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: input.cycle, value: input.value },
      customerData: input.customerData,
      externalReference: input.externalReference,
      callback: { successUrl: input.successUrl },
    }),
  });
}
