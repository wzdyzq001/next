import React from 'react';
import type { SceneConfig } from '../types';
import '../nluDemo.css';

interface SceneSelectorProps {
  activeModule: 'reservation' | 'reminder' | 'pickup_code' | 'delivery';
  onModuleChange: (module: 'reservation' | 'reminder' | 'pickup_code' | 'delivery') => void;
  scenes: SceneConfig[];
  activeSceneId: string | null;
  onSceneSelect: (scene: SceneConfig) => void;
}

const MODULE_TABS = [
  { key: 'reservation', label: '帮我约' },
  { key: 'reminder', label: '使用提醒' },
  { key: 'pickup_code', label: '取餐码' },
  { key: 'delivery', label: '配送进度' },
] as const;

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  activeModule,
  onModuleChange,
  scenes,
  activeSceneId,
  onSceneSelect,
}) => {
  const filteredScenes = scenes.filter((s) => s.module === activeModule);

  return (
    <div className="nlu-demo-sidebar">
      <div className="nlu-demo-sidebar-header">
        AI 助手全景交互图 V1.1
      </div>
      <div className="nlu-demo-tabs">
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`nlu-demo-tab ${activeModule === tab.key ? 'active' : ''}`}
            onClick={() => onModuleChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="nlu-demo-scene-list">
        {filteredScenes.map((scene) => (
          <button
            key={scene.id}
            className={`nlu-demo-scene-card ${activeSceneId === scene.id ? 'active' : ''}`}
            onClick={() => onSceneSelect(scene)}
          >
            <div className="nlu-demo-scene-title">{scene.title}</div>
            <div className="nlu-demo-scene-desc">{scene.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
