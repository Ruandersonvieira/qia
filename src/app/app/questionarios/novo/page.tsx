import { requireGestor } from "@/lib/auth/session";
import { createQuestionnaire } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const USE_CASE_OPTIONS: { value: string; label: string }[] = [
  { value: "clima", label: "Clima" },
  { value: "nr1", label: "NR-1" },
  { value: "market_research", label: "Pesquisa de mercado" },
  { value: "nps", label: "NPS" },
  { value: "other", label: "Outro" },
];

export default async function NovoQuestionarioPage() {
  await requireGestor();

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Novo questionário</h1>

      <form action={createQuestionnaire} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input id="title" type="text" name="title" placeholder="Ex.: Pesquisa de Clima" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" placeholder="Descrição opcional" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="useCase">Caso de uso</Label>
          <Select name="useCase" defaultValue="other">
            <SelectTrigger id="useCase" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USE_CASE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit">Criar questionário</Button>
      </form>
    </div>
  );
}
