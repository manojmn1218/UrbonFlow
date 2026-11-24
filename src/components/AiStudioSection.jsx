import React, { useState } from 'react';
import { Cpu, BarChart3, Network, Sparkles } from 'lucide-react';
import AiPredictionsSection from './AiPredictionsSection';
import AnalyticsSection from './AnalyticsSection';
import ModelInsightsSection from './ModelInsightsSection';

export default function AiStudioSection({
  activeHorizon,
  setActiveHorizon,
  currentLocation,
  onLocationChange,
  activeSubTab = 'predictions',
  setActiveSubTab
}) {
  const [localSubTab, setLocalSubTab] = useState('predictions');
  const currentSubTab = setActiveSubTab ? activeSubTab : localSubTab;
  const setSubTab = setActiveSubTab || setLocalSubTab;

  const SUB_TABS = [
    {
      id: 'predictions',
      label: 'AI Forecasting & Policies',
      icon: Cpu,
      badge: 'ST-GNN Deep Inference'
    },
    {
      id: 'analytics',
      label: 'Flow Analytics & Heatmap',
      icon: BarChart3,
      badge: 'Diurnal Matrix'
    },
    {
      id: 'insights',
      label: 'Model Evaluation & Verification',
      icon: Network,
      badge: 'INT8 Quantization'
    }
  ];

  return (
    <div className="space-y-3.5">
      {/* Studio Sub-Navigation Bar in Chocolate & Cream */}
      <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-2.5 sm:px-4 sm:py-2 rounded-2xl border border-[#EADBCE] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#5C331E] text-[#FFFDF9] shadow-xs">
            <Sparkles className="w-4 h-4 text-[#E08E45]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#2C1810] tracking-tight">
              AI Intelligence & Analytics Studio
            </h2>
            <p className="text-[11px] text-[#7D5138]">
              Consolidated neural inference, spatial telemetry heatmaps, and empirical validation
            </p>
          </div>
        </div>

        {/* 3-Way Sub-Tab Switcher */}
        <div className="flex items-center bg-[#F5EFEB] p-1 rounded-xl border border-[#EADBCE]/70 self-start sm:self-auto overflow-x-auto max-w-full">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#5C331E] text-[#FFFDF9] shadow-sm shadow-[#3D2317]/25'
                    : 'text-[#7D5138] hover:text-[#2C1810]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Studio Sub-View */}
      {currentSubTab === 'predictions' && (
        <AiPredictionsSection 
          activeHorizon={activeHorizon}
          setActiveHorizon={setActiveHorizon}
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
        />
      )}

      {currentSubTab === 'analytics' && (
        <AnalyticsSection 
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
        />
      )}

      {currentSubTab === 'insights' && (
        <ModelInsightsSection 
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
        />
      )}
    </div>
  );
}
