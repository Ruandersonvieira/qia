import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { requireGestor } from '@/lib/auth/session';
import { getQuestionnaire, updateQuestionnaireStatus } from '../actions';
import { listQuestions } from './perguntas/actions';
import { listAllCategories } from '../../categorias/actions';
import { openPublicCycle, listCycles } from '../../ciclos/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TzOffsetInput } from '@/components/tz-offset-input';
import AddQuestionDialog from './add-question-dialog';
import EditQuestionnaireDialog from './edit-questionnaire-dialog';
import QuestionList from './question-list';
import { PageContainer } from '../../_components/page-container';
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_VARIANTS } from '../../ciclos/status';
import { USE_CASE_LABELS, STATUS_LABELS, STATUS_VARIANTS } from '../status';

export default async function QuestionarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const questionnaire = await getQuestionnaire(id);
  if (!questionnaire) notFound();
  const [questions, categories, cycles] = await Promise.all([
    listQuestions(id),
    listAllCategories(),
    listCycles(id),
  ]);
  const isActive = questionnaire.status === 'active';

  return (
    <PageContainer
      icon={FileText}
      title={questionnaire.title}
      titleExtra={
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[questionnaire.status]}>
            {STATUS_LABELS[questionnaire.status]}
          </Badge>
          <EditQuestionnaireDialog questionnaire={questionnaire} />
        </div>
      }
      description={
        <>
          {questionnaire.description && <p>{questionnaire.description}</p>}
          {questionnaire.useCase && (
            <p>Caso de uso: {USE_CASE_LABELS[questionnaire.useCase]}</p>
          )}
        </>
      }
    >
      <div className="flex gap-2">
        {questionnaire.status !== 'active' && (
          <form action={updateQuestionnaireStatus}>
            <input type="hidden" name="id" value={questionnaire.id} />
            <input type="hidden" name="status" value="active" />
            <Button type="submit" variant="default">
              Ativar
            </Button>
          </form>
        )}
        {questionnaire.status !== 'archived' && (
          <form action={updateQuestionnaireStatus}>
            <input type="hidden" name="id" value={questionnaire.id} />
            <input type="hidden" name="status" value="archived" />
            <Button type="submit" variant="outline">
              Arquivar
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Perguntas</h2>
          <AddQuestionDialog questionnaireId={id} categories={categories} />
        </div>
        <QuestionList
          questionnaireId={id}
          questions={questions}
          categories={categories}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ciclos</h2>

        <form
          action={openPublicCycle}
          className="space-y-4 rounded-lg border p-4"
        >
          <input type="hidden" name="questionnaireId" value={id} />
          <TzOffsetInput />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="endsAt">Encerra em (opcional)</Label>
              <Input id="endsAt" type="datetime-local" name="endsAt" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResponses">
                Máximo de respostas (opcional)
              </Label>
              <Input
                id="maxResponses"
                type="number"
                name="maxResponses"
                min={1}
              />
            </div>
          </div>

          <Button type="submit" disabled={!isActive}>
            Abrir ciclo
          </Button>
          {!isActive && (
            <p className="text-sm text-muted-foreground">
              Ative o questionário para poder abrir um ciclo público.
            </p>
          )}
        </form>

        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum ciclo criado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {cycles.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={CYCLE_STATUS_VARIANTS[c.status]}>
                      {CYCLE_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Criado em {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button
                  render={<Link href={`/app/ciclos/${c.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  Ver ciclo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
