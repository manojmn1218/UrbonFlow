import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SlidingWindowControls({
  windows,
  currentIndex,
  onSelectIndex,
  onPrev,
  onNext
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < windows.length) onSelectIndex(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onPrev, onNext, onSelectIndex, windows.length]);

  return (
    <>
      {currentIndex > 0 && (
        <button
          onClick={onPrev}
          className="fixed left-3 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-float border border-slate-200/90 backdrop-blur-xl transition-all duration-200 hover:scale-110 group hidden sm:flex items-center justify-center"
          title="Previous Window (←)"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {currentIndex < windows.length - 1 && (
        <button
          onClick={onNext}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-float border border-slate-200/90 backdrop-blur-xl transition-all duration-200 hover:scale-110 group hidden sm:flex items-center justify-center"
          title="Next Window (→)"
        >
          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] pointer-events-auto select-none">
        <div className="bg-white/92 backdrop-blur-2xl border border-slate-200/90 rounded-full px-2.5 py-1.5 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_0_1px_1px_rgba(15,23,42,0.06)] flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="Slide Left (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl overflow-x-auto">
            {windows.map((win, idx) => {
              const Icon = win.icon;
              const isActive = currentIndex === idx;
              const isPast = currentIndex > idx;

              return (
                <React.Fragment key={win.id}>
                  <button
                    onClick={() => onSelectIndex(idx)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold scale-[1.02]' 
                        : isPast
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }
                    `}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isPast ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="hidden sm:inline">{win.label}</span>
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      isActive ? 'bg-white/20 text-white' : isPast ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-500'
                    }`}>
                      0{idx + 1}
                    </span>
                  </button>

                  {idx < windows.length - 1 && (
                    <span className={`text-[9px] font-mono select-none px-0.5 ${
                      isPast 
                        ? 'text-emerald-500 font-bold' 
                        : isActive 
                          ? 'text-blue-500 font-bold' 
                          : 'text-slate-300'
                    }`}>
                      ➔
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <button
            onClick={onNext}
            disabled={currentIndex === windows.length - 1}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="Slide Right (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="hidden lg:flex items-center pl-1 pr-2 border-l border-slate-200 text-[10px] font-mono text-slate-400">
            <span>USE ARROWS ← →</span>
          </div>
        </div>
      </div>
    </>
  );
}
