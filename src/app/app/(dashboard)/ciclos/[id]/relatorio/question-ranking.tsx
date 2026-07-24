import type { RankedQuestion } from "@/lib/analysis/question-ranking";
import { scoreColorClass } from "../../status";

function RankedList({ items }: { items: RankedQuestion[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {items.map((q) => (
        <li key={q.questionId} className="flex items-start justify-between gap-3">
          <span>
            {q.text}
            <span className="text-muted-foreground"> — {q.categoryName}</span>
          </span>
          <span className={`shrink-0 font-semibold ${scoreColorClass(q.healthScore)}`}>{Math.round(q.healthScore)}</span>
        </li>
      ))}
    </ol>
  );
}

export function QuestionRanking({ best, worst }: { best: RankedQuestion[]; worst: RankedQuestion[] }) {
  if (best.length === 0 && worst.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {best.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Melhores avaliações</p>
          <RankedList items={best} />
        </div>
      )}
      {worst.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Precisam de atenção</p>
          <RankedList items={worst} />
        </div>
      )}
    </div>
  );
}
