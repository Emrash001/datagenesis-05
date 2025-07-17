
import React from 'react';
import SimpleRealTimeMonitor from './SimpleRealTimeMonitor';

interface RealTimeActivityMonitorProps {
  className?: string;
  maxLogs?: number;
  isGenerating?: boolean;
  isCollapsible?: boolean;
  isDraggable?: boolean;
  defaultCollapsed?: boolean;
}

export const RealTimeActivityMonitor: React.FC<RealTimeActivityMonitorProps> = ({
  isGenerating = false,
  className = ''
}) => {
  return <SimpleRealTimeMonitor isGenerating={isGenerating} className={className} />;
};

export default RealTimeActivityMonitor;
