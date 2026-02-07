import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ fullScreen = false, text = "加载中...", className }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">{text}</p>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col items-center justify-center w-full p-8", className)}>
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
      <p className="text-xs text-slate-400 font-medium">{text}</p>
    </div>
  );
}
