import { Lightbulb } from "lucide-react";
import type { Recommendation } from "@/db/schema";

export function RecommendationList({
  recommendations,
  variant = "plain",
}: {
  recommendations: Recommendation[];
  variant?: "featured" | "plain";
}) {
  if (recommendations.length === 0) return null;

  if (variant === "featured") {
    return (
      <ul className="space-y-3">
        {recommendations.map((r, i) => (
          <li key={i} className="flex gap-3 border-l-2 border-primary py-1 pl-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">{r.title}</span>
              {r.description && <span className="text-muted-foreground"> — {r.description}</span>}
            </p>
          </li>
        ))}
      </ul>
    );
  }

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
