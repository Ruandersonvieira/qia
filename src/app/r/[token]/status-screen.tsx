import type { LucideIcon } from "lucide-react";

export function StatusScreen({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F6F5] p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-[#dce6e4] bg-white p-8 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#FFC940]/20 text-[#0E2A32]">
          <Icon className="size-6" />
        </span>
        <h1 className="text-lg font-bold text-[#0E2A32]">{title}</h1>
        <p className="text-sm text-[#46626B]">{message}</p>
      </div>
    </div>
  );
}
