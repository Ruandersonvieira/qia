import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  icon: LucideIcon;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  titleExtra?: React.ReactNode;
  action?: React.ReactNode;
};

export function PageHeader({ icon: Icon, title, eyebrow, description, titleExtra, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
        <div className="flex items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Icon className="size-6 shrink-0 text-muted-foreground" />
            {title}
          </h1>
          {titleExtra}
        </div>
        {description && <div className="space-y-0.5 text-sm text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
