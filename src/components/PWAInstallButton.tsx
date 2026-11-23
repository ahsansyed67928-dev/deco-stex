import { useState } from 'react';
import { Download, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'subtle';
}

export function PWAInstallButton({ variant = 'primary' }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Installed for Offline Study</span>
      </span>
    );
  }

  if (!canInstall && !isIOS) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
        <span>Offline Cache Active</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'primary'
            ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 active:bg-sky-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install Offline App</span>
      </button>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 id="ios-install-title" className="text-lg font-semibold text-slate-900">
                  Install DECO Prep on iOS
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Save this app to your Home Screen for full offline access without browser bars.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 shrink-0">
                  1
                </span>
                <span>
                  Tap the <Share className="inline w-4 h-4 mx-0.5 text-sky-600" />{' '}
                  <strong>Share</strong> button in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <PlusSquare className="inline w-4 h-4 mx-0.5 text-sky-600" />{' '}
                  <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to launch DECO Prep offline anytime.
                </span>
              </li>
            </ol>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
