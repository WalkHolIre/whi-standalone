import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-whi mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}