import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./page-header";

const MAX_WIDTHS = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
} as const;

type PageContainerProps = {
  size?: keyof typeof MAX_WIDTHS;
  icon: LucideIcon;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  titleExtra?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function PageContainer({
  size = "md",
  icon,
  title,
  eyebrow,
  description,
  titleExtra,
  action,
  children,
}: PageContainerProps) {
  return (
    <div className={`mx-auto ${MAX_WIDTHS[size]} space-y-8 p-8`}>
      <PageHeader
        icon={icon}
        title={title}
        eyebrow={eyebrow}
        description={description}
        titleExtra={titleExtra}
        action={action}
      />
      {children}
    </div>
  );
}
