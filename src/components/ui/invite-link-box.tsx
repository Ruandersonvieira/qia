import { CopyButton } from "@/components/ui/copy-button";

export function InviteLinkBox({ url }: { url: string }) {
  return (
    <div className="mt-2 space-y-1 rounded border p-3">
      <p className="text-sm text-muted-foreground">Link de convite:</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto text-sm">{url}</code>
        <CopyButton value={url} showIcon />
      </div>
    </div>
  );
}
