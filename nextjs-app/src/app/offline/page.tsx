import { Telescope } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <Telescope className="h-10 w-10 text-sky-400/60" strokeWidth={1.5} />
      <h1 className="text-lg font-semibold text-zinc-200">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        StarGazer can&apos;t reach the network right now. Reconnect and reload to see tonight&apos;s conditions.
      </p>
    </div>
  );
}
