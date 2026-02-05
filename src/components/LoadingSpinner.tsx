import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px] text-blue-600">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
