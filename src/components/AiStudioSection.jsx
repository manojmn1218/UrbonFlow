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
      {/* Studio Sub-Navigation Bar in Refined Decent Tones */}
      <div className="bg-white/90 backdrop-blur-2xl p-2.5 sm:px-4 sm:py-2 rounded-2xl border border-[#E8E2D9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
            <Sparkles className="w-4 h-4 text-[#A86032]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#231E1A] tracking-tight">
              AI Intelligence & Analytics Studio
            </h2>
            <p className="text-[11px] text-[#64564B]">
              Consolidated neural inference, spatial telemetry heatmaps, and empirical validation
            </p>
          </div>
        </div>

        {/* 3-Way Sub-Tab Switcher */}
        <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D9] self-start sm:self-auto overflow-x-auto max-w-full">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#362E28] text-white shadow-xs'
                    : 'text-[#64564B] hover:text-[#231E1A]'
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
