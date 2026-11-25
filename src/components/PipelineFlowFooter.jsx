import React from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { PIPELINE_STEPS } from './PipelineFlowchartNav';

export default function PipelineFlowFooter({
  currentIndex,
  onSelectIndex,
  currentLocation
}) {
  const currentStep = PIPELINE_STEPS[currentIndex] || PIPELINE_STEPS[0];
  const prevStep = currentIndex > 0 ? PIPELINE_STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[currentIndex + 1] : null;

  return (
    <div className="mt-5 bg-white/85 backdrop-blur-xl p-3 sm:px-4 sm:py-3 rounded-2xl border border-[#E8E2D9] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all select-none">
      {/* Left: Previous Stage CTA */}
      <div className="flex items-center gap-2">
        {prevStep ? (
          <button
            type="button"
            onClick={() => onSelectIndex(currentIndex - 1)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-white border border-[#E8E2D9] text-[#362E28] hover:text-[#231E1A] text-xs font-bold transition-all shadow-2xs group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#64564B] group-hover:-translate-x-0.5 transition-transform" />
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-[#8C827A] block font-mono">Stage {prevStep.number}</span>
              <span className="truncate">{prevStep.title}</span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9]/70 text-[11px] font-semibold text-[#64564B]">
            <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
            <span>Stage 01: Ingestion Active</span>
          </div>
        )}
      </div>

      {/* Center: Interactive Stepper Flow Pills */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          {PIPELINE_STEPS.map((step) => {
            const isActive = currentIndex === step.index;
            const isDone = currentIndex > step.index;
            return (
              <button
                key={step.id}
                onClick={() => onSelectIndex(step.index)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#362E28] text-white shadow-xs scale-105'
                    : isDone
                      ? 'bg-[#F0F7F2] text-[#1E5631] hover:bg-[#EAF5EE] border border-[#C8E4D1]'
                      : 'bg-[#FAF8F5] text-[#64564B] hover:bg-[#F3EFE9] border border-[#E8E2D9]'
                }`}
                title={`Jump to Stage ${step.number}: ${step.title}`}
              >
                <span>{step.number}</span>
                <span className="hidden md:inline">{step.title}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[10px] font-mono text-[#8C827A] hidden sm:block">
          Pipeline Flow: Step {currentIndex + 1} of 3 • Press ← / → or 1-3
        </span>
      </div>

      {/* Right: Next Stage CTA */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {nextStep ? (
          <button
            type="button"
            onClick={() => onSelectIndex(currentIndex + 1)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#362E28] hover:bg-[#231E1A] text-white text-xs font-bold transition-all shadow-xs group"
          >
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-[#CBBFB4] block font-mono">Next: Stage {nextStep.number}</span>
              <span className="truncate">{nextStep.title}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectIndex(0)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D6A4F] to-[#1E4A37] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all"
          >
            <span>Restart Pipeline Cycle</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
