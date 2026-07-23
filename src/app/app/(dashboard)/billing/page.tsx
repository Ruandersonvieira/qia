import { CreditCard } from "lucide-react";
import { getBillingOverview } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "../_components/page-container";

const STATUS_LABEL: Record<string, string> = {
  none: "Sem assinatura",
  pending: "Aguardando pagamento",
  active: "Ativa",
  overdue: "Atrasada",
  canceled: "Cancelada",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  received: "Recebido",
  overdue: "Atrasado",
  refunded: "Reembolsado",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function BillingPage() {
  const { plan, billingCycle, subscriptionStatus, responsesThisMonth, monthlyResponseLimit, paymentHistory } =
    await getBillingOverview();

  const overLimit = monthlyResponseLimit != null && responsesThisMonth > monthlyResponseLimit;
  const usagePct = monthlyResponseLimit ? Math.min(100, Math.round((responsesThisMonth / monthlyResponseLimit) * 100)) : 0;

  return (
    <PageContainer icon={CreditCard} title="Billing" description="Plano, uso do mês e histórico de pagamentos.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plano atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan ? (
              <>
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {Number(billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly).toFixed(2)}
                  {billingCycle === "annual" ? "/ano" : "/mês"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum plano atribuído ainda.</p>
            )}
            <Badge variant={subscriptionStatus === "active" ? "default" : "secondary"}>
              {STATUS_LABEL[subscriptionStatus]}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso do mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">
              {responsesThisMonth}
              {monthlyResponseLimit != null && <span className="text-base font-normal text-muted-foreground"> / {monthlyResponseLimit} respostas</span>}
            </p>
            {monthlyResponseLimit != null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${overLimit ? "bg-red-600" : "bg-primary"}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            {overLimit && (
              <p className="text-sm text-red-600">
                Uso acima do limite do plano este mês.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {paymentHistory.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span>{dateFormatter.format(new Date(p.dueDate))}</span>
                  <span className="text-muted-foreground">R$ {Number(p.value).toFixed(2)}</span>
                  <Badge variant={p.status === "confirmed" || p.status === "received" ? "default" : "secondary"}>
                    {PAYMENT_STATUS_LABEL[p.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
