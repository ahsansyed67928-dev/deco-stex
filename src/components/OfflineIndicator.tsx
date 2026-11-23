import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs sm:text-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 font-medium">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          Offline Study Mode — All DECO units, flashcards, practice tests, and your saved progress remain available locally.
        </span>
      </div>
    </div>
  );
}
