import type { Recommendation } from "@/db/schema";

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) return null;
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {recommendations.map((r, i) => (
        <li key={i}>
          <span className="font-medium">{r.title}</span>
          {r.description && <span className="text-muted-foreground"> — {r.description}</span>}
        </li>
      ))}
    </ol>
  );
}
