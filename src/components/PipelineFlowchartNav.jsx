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
    phase: 'DATA INGEST',
    title: 'Overview Deck',
    subtitle: 'City Sensor Feeds',
    icon: LayoutDashboard,
    badge: 'Live Feeds'
  },
  {
    index: 1,
    id: 'traffic_map',
    number: '02',
    phase: 'SPATIAL GIS',
    title: 'Live GIS Map',
    subtitle: 'Point A ➔ B Routing',
    icon: Map,
    badge: 'Real-Time Vector'
  },
  {
    index: 2,
    id: 'predictions',
    number: '03',
    phase: 'DEEP LEARNING',
    title: 'AI Forecasting',
    subtitle: 'ST-GNN Inference',
    icon: Cpu,
    badge: '15m / 30m / 60m'
  },
  {
    index: 3,
    id: 'analytics',
    number: '04',
    phase: 'METRIC ENGINE',
    title: 'Traffic Analytics',
    subtitle: 'Peak Trends & Hotspots',
    icon: BarChart3,
    badge: '24h Density'
  },
  {
    index: 4,
    id: 'insights',
    number: '05',
    phase: 'VALIDATION',
    title: 'Model Evaluation',
    subtitle: 'Graph Topology & Loss',
    icon: Network,
    badge: '94.2% Acc'
  }
];

export default function PipelineFlowchartNav({
  currentIndex,
  onSelectIndex,
  currentLocation
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="w-full bg-[#FFFDF9]/70 backdrop-blur-xl border-b border-[#EADBCE]/70 shadow-sm z-20 transition-all select-none">
      {/* Top Flowchart Header Bar */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[#F5EFEB] text-[#5C331E] border border-[#EADBCE]">
            <Workflow className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2C1810]">
            AI Traffic Engineering Pipeline
          </span>
          <span className="text-[10px] text-[#7D5138] font-mono hidden md:inline">
            • Flowchart Workflow: Ingestion ➔ GIS Routing ➔ Neural Inference ➔ Analytics ➔ Validation
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Step Previous & Next Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg text-[#7D5138] hover:text-[#2C1810] hover:bg-[#F5EFEB] disabled:opacity-25 disabled:pointer-events-none transition-all"
              title="Previous Pipeline Stage (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold text-[#4E2E1E] bg-[#F5EFEB] border border-[#EADBCE] px-2.5 py-0.5 rounded-full">
              Stage {currentIndex + 1} of 5: {PIPELINE_STEPS[currentIndex]?.title}
            </span>
            <button
              type="button"
              onClick={() => onSelectIndex(Math.min(PIPELINE_STEPS.length - 1, currentIndex + 1))}
              disabled={currentIndex === PIPELINE_STEPS.length - 1}
              className="p-1 rounded-lg text-[#7D5138] hover:text-[#2C1810] hover:bg-[#F5EFEB] disabled:opacity-25 disabled:pointer-events-none transition-all"
              title="Next Pipeline Stage (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-[#7D5138] hover:text-[#2C1810] hover:bg-[#F5EFEB] transition-colors"
            title={isCollapsed ? "Expand Flowchart" : "Collapse Flowchart"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visual Pipeline Progress Bar Connecting All Stages */}
      <div className="w-full bg-[#EADBCE]/40 h-1 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#C47D3B] via-[#5C331E] to-[#2D6A4F] transition-all duration-500 ease-out"
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
                        ? 'bg-gradient-to-br from-[#4E2E1E] via-[#3D2317] to-[#2C1810] text-[#FFFDF9] border-[#3D2317] shadow-lg shadow-[#2C1810]/20 ring-2 ring-[#7D5138]/40 scale-[1.02] backdrop-blur-md' 
                        : isCompleted
                          ? 'bg-[#EAF2EC]/60 hover:bg-[#EAF2EC]/85 border-[#C4DFC8] text-[#2C1810] backdrop-blur-md'
                          : 'bg-[#FFFDF9]/55 hover:bg-[#FFFDF9]/85 border-[#EADBCE]/70 text-[#4E2E1E] hover:border-[#C49A80] backdrop-blur-md shadow-2xs'
                      }
                    `}
                  >
                    {/* Top Phase Ribbon & Status */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${
                        isActive ? 'text-[#DFC4B3]' : isCompleted ? 'text-[#2D6A4F]' : 'text-[#9C6D52]'
                      }`}>
                        STEP {step.number} • {step.phase}
                      </span>

                      {/* Status Indicator */}
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#2D6A4F] bg-[#FFFDF9]/90 px-1.5 py-0.2 rounded-full border border-[#C4DFC8]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Done
                        </span>
                      ) : isActive ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#FFFDF9] bg-white/20 px-1.5 py-0.2 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-[#7D5138] bg-[#F5EFEB] border border-[#EADBCE] px-1.5 py-0.2 rounded">
                          Next
                        </span>
                      )}
                    </div>

                    {/* Step Title & Icon */}
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl shrink-0 transition-all ${
                        isActive 
                          ? 'bg-white/20 text-[#FFFDF9]' 
                          : isCompleted 
                            ? 'bg-[#D8EADB] text-[#2D6A4F]' 
                            : 'bg-[#F5EFEB] text-[#653D28] group-hover:bg-[#EADBCE] group-hover:text-[#3D2317]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-black truncate leading-tight ${
                          isActive ? 'text-[#FFFDF9]' : 'text-[#2C1810]'
                        }`}>
                          {step.title}
                        </h4>
                        <p className={`text-[10px] truncate leading-tight ${
                          isActive ? 'text-[#DFC4B3]' : 'text-[#7D5138]'
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
                            ? 'text-[#5C331E] animate-pulse' 
                            : 'text-[#DFC4B3]'
                      }`}>
                        <div className={`hidden lg:block w-3 sm:w-4 h-0.5 ${
                          isCompleted ? 'bg-[#2D6A4F]' : isActive ? 'bg-[#5C331E]' : 'bg-[#EADBCE]'
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
