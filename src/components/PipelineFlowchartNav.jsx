import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Cpu, 
  BarChart3, 
  Network, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  Workflow,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const PIPELINE_STEPS = [
  {
    index: 0,
    id: 'overview',
    number: '01',
    phase: 'DATA INGESTION',
    title: 'Overview Deck',
    subtitle: 'City Sensor Feeds & KPIs',
    icon: LayoutDashboard,
    badge: 'Live Operations'
  },
  {
    index: 1,
    id: 'traffic_map',
    number: '02',
    phase: 'SPATIAL GIS',
    title: 'Live GIS Map',
    subtitle: 'Point A ➔ B Routing & Flow',
    icon: Map,
    badge: 'Real-Time Vector'
  },
  {
    index: 2,
    id: 'ai_studio',
    number: '03',
    phase: 'DEEP INTELLIGENCE',
    title: 'AI Studio & Analytics',
    subtitle: 'Forecasting, Heatmaps & Validation',
    icon: Cpu,
    badge: 'Neural Engine'
  }
];

export default function PipelineFlowchartNav({
  currentIndex,
  onSelectIndex,
  currentLocation
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border-b border-[#E8E2D9] shadow-2xs z-20 transition-all select-none">
      {/* Top Flowchart Header Bar */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[#FAF8F5] text-[#4C4138] border border-[#E8E2D9]">
            <Workflow className="w-3.5 h-3.5 text-[#A86032]" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#231E1A]">
            AI Traffic Engineering Pipeline
          </span>
          <span className="text-[10px] text-[#64564B] font-mono hidden md:inline">
            • 3-Stage Workflow: City Ingestion ➔ Spatial GIS Routing ➔ AI Intelligence & Analytics
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Step Previous & Next Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg text-[#64564B] hover:text-[#231E1A] hover:bg-[#FAF8F5] disabled:opacity-25 disabled:pointer-events-none transition-all"
              title="Previous Pipeline Stage (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold text-[#362E28] bg-[#FAF8F5] border border-[#E8E2D9] px-2.5 py-0.5 rounded-full">
              Stage {currentIndex + 1} of 3: {PIPELINE_STEPS[currentIndex]?.title}
            </span>
            <button
              type="button"
              onClick={() => onSelectIndex(Math.min(PIPELINE_STEPS.length - 1, currentIndex + 1))}
              disabled={currentIndex === PIPELINE_STEPS.length - 1}
              className="p-1 rounded-lg text-[#64564B] hover:text-[#231E1A] hover:bg-[#FAF8F5] disabled:opacity-25 disabled:pointer-events-none transition-all"
              title="Next Pipeline Stage (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-[#64564B] hover:text-[#231E1A] hover:bg-[#FAF8F5] transition-colors"
            title={isCollapsed ? "Expand Flowchart" : "Collapse Flowchart"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visual Pipeline Progress Bar Connecting All Stages */}
      <div className="w-full bg-[#E8E2D9]/50 h-1 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#A86032] via-[#4C4138] to-[#2D6A4F] transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / PIPELINE_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Connected Flowchart Stage Boxes */}
      {!isCollapsed && (
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pb-3 pt-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-[760px] lg:min-w-0 justify-between">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentIndex === step.index;
              const isCompleted = currentIndex > step.index;
              const isLast = idx === PIPELINE_STEPS.length - 1;

              return (
                <React.Fragment key={step.id}>
                  {/* Flowchart Node Box */}
                  <button
                    type="button"
                    onClick={() => onSelectIndex(step.index)}
                    className={`
                      group relative flex-1 text-left p-2.5 sm:p-3 rounded-2xl border transition-all duration-300
                      ${isActive 
                        ? 'bg-white text-[#231E1A] border-[#A86032] shadow-sm ring-2 ring-[#A86032]/25 scale-[1.01] backdrop-blur-md' 
                        : isCompleted
                          ? 'bg-[#F0F7F2]/80 hover:bg-[#EAF5EE] border-[#C8E4D1] text-[#1E5631] backdrop-blur-md'
                          : 'bg-white/60 hover:bg-white border-[#E8E2D9] text-[#64564B] hover:text-[#231E1A] hover:border-[#D5CCC0] backdrop-blur-md shadow-2xs'
                      }
                    `}
                  >
                    {/* Top Phase Ribbon & Status */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${
                        isActive ? 'text-[#A86032]' : isCompleted ? 'text-[#2D6A4F]' : 'text-[#8C827A]'
                      }`}>
                        STEP {step.number} • {step.phase}
                      </span>

                      {/* Status Indicator */}
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#2D6A4F] bg-white px-1.5 py-0.2 rounded-full border border-[#C8E4D1]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Done
                        </span>
                      ) : isActive ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#A86032] bg-[#FEF6F0] border border-[#F2D7C4] px-1.5 py-0.2 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A86032] animate-ping"></span>
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-[#64564B] bg-[#FAF8F5] border border-[#E8E2D9] px-1.5 py-0.2 rounded">
                          Next
                        </span>
                      )}
                    </div>

                    {/* Step Title & Icon */}
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl shrink-0 transition-all ${
                        isActive 
                          ? 'bg-[#FEF6F0] text-[#A86032] border border-[#F2D7C4]' 
                          : isCompleted 
                            ? 'bg-[#D8EADB] text-[#2D6A4F]' 
                            : 'bg-[#FAF8F5] text-[#64564B] group-hover:bg-[#F3EFE9] group-hover:text-[#231E1A]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black truncate leading-tight text-[#231E1A]">
                          {step.title}
                        </h4>
                        <p className={`text-[10px] truncate leading-tight ${
                          isActive ? 'text-[#837367]' : 'text-[#8C827A]'
                        }`}>
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Flow Connector Arrow between Boxes */}
                  {!isLast && (
                    <div className="shrink-0 flex items-center justify-center px-0.5">
                      <div className={`flex items-center transition-all ${
                        isCompleted 
                          ? 'text-[#2D6A4F]' 
                          : isActive 
                            ? 'text-[#A86032]' 
                            : 'text-[#D5CCC0]'
                      }`}>
                        <div className={`hidden lg:block w-3 sm:w-4 h-0.5 ${
                          isCompleted ? 'bg-[#2D6A4F]' : isActive ? 'bg-[#A86032]' : 'bg-[#E8E2D9]'
                        }`} />
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
