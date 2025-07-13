import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Shield, 
  Zap,
  Users,
  Target,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Cog,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useWebSocket } from '../hooks/useWebSocket';
import { cn } from '../lib/utils';

interface AgentLog {
  id: string;
  timestamp: Date;
  type: 'initialization' | 'domain_analysis' | 'privacy_assessment' | 'bias_detection' | 'relationship_mapping' | 'quality_planning' | 'data_generation' | 'quality_validation' | 'final_assembly' | 'completion' | 'error';
  status: 'started' | 'in_progress' | 'completed' | 'error';
  message: string;
  agent: string;
  progress?: number;
  metadata?: {
    domain?: string;
    privacyScore?: number;
    biasScore?: number;
    qualityScore?: number;
    relationshipCount?: number;
    recordCount?: number;
  };
  level: 'info' | 'success' | 'warning' | 'error';
}

interface EnhancedRealTimeMonitorProps {
  isGenerating?: boolean;
  onClose?: () => void;
  className?: string;
}

export const EnhancedRealTimeMonitor: React.FC<EnhancedRealTimeMonitorProps> = ({ 
  isGenerating = false,
  onClose,
  className
}) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 500 }); // Bottom left by default
  
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { isConnected, lastMessage } = useWebSocket('guest_user');

  // Parse real-time messages based on your exact log format
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    try {
      const messageData = lastMessage.data;
      let logData: any = null;

      // Handle different message types from your backend logs
      if (lastMessage.type === 'generation_update' && messageData) {
        logData = messageData;
      } else if (lastMessage.type === 'raw_message' && messageData?.message) {
        const message = messageData.message;
        
        // Parse your exact log patterns
        const logPatterns = {
          initialization: /🤖 Initializing (.*)/,
          domainAnalysis: /🧠 Domain Expert analyzing data structure/,
          domainComplete: /✅ Domain Expert: Detected (\w+) domain/,
          privacyStart: /🔒 Privacy Agent analyzing data sensitivity/,
          privacyComplete: /✅ Privacy Agent: (\d+)% privacy score/,
          biasStart: /⚖️ Bias Detection Agent analyzing for fairness/,
          biasComplete: /✅ Bias Detector: (\d+)% bias score/,
          relationshipStart: /🔗 Relationship Agent mapping data connections/,
          relationshipComplete: /✅ Relationship Agent: Mapped (\d+) relationships/,
          qualityStart: /🎯 Quality Agent planning generation strategy/,
          qualityComplete: /✅ Quality Agent: Generation strategy optimized/,
          generationStart: /🤖 GEMINI: .* Generating synthetic data with Gemini/,
          generationComplete: /✅ Generated (\d+) records using Gemini/,
          validationStart: /🔍 Quality Agent validating generated data/,
          validationComplete: /✅ Quality validation: (\d+)% overall quality/,
          finalAssembly: /📦 Assembling final results/,
          completion: /🎉 Multi-agent generation completed successfully/
        };

        // Extract progress from log messages like "[25%] domain_analysis: ..."
        const progressMatch = message.match(/\[(\d+)%\]\s*([^:]+):\s*(.+)/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          const step = progressMatch[2].trim();
          const stepMessage = progressMatch[3].trim();
          
          logData = {
            progress,
            step,
            message: stepMessage,
            type: 'progress_update'
          };
        }

        // Parse specific agent messages
        for (const [pattern, regex] of Object.entries(logPatterns)) {
          const match = message.match(regex);
          if (match) {
            logData = {
              pattern,
              match: match[1] || match[0],
              message: message.trim(),
              type: 'agent_message'
            };
            break;
          }
        }
      }

      if (logData) {
        const newLog = parseLogToAgentLog(logData);
        if (newLog) {
          setLogs(prev => {
            const updated = [newLog, ...prev.slice(0, 19)]; // Keep last 20 logs
            return updated;
          });

          if (logData.progress !== undefined && logData.progress >= 0) {
            setCurrentProgress(logData.progress);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse real-time message:', error);
    }
  }, [lastMessage, isPaused]);

  // Helper function to convert parsed data to AgentLog
  const parseLogToAgentLog = (data: any): AgentLog | null => {
    const timestamp = new Date();
    const id = `${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

    if (data.type === 'progress_update') {
      const type = mapStepToType(data.step);
      const agent = mapStepToAgent(data.step);
      
      return {
        id,
        timestamp,
        type,
        status: data.progress === 100 ? 'completed' : 'in_progress',
        message: data.message,
        agent,
        progress: data.progress,
        level: data.progress === 100 ? 'success' : 'info'
      };
    }

    if (data.type === 'agent_message') {
      const parsedLog = parseAgentMessage(data.pattern, data.match, data.message);
      if (parsedLog) {
        return {
          id,
          timestamp,
          ...parsedLog
        };
      }
    }

    return null;
  };

  // Map your log steps to types
  const mapStepToType = (step: string): AgentLog['type'] => {
    const stepMapping: Record<string, AgentLog['type']> = {
      'initialization': 'initialization',
      'domain_analysis': 'domain_analysis',
      'privacy_assessment': 'privacy_assessment',
      'bias_detection': 'bias_detection',
      'relationship_mapping': 'relationship_mapping',
      'quality_planning': 'quality_planning',
      'data_generation': 'data_generation',
      'quality_validation': 'quality_validation',
      'final_assembly': 'final_assembly',
      'completion': 'completion'
    };
    return stepMapping[step] || 'initialization';
  };

  // Map steps to agent names
  const mapStepToAgent = (step: string): string => {
    const agentMapping: Record<string, string> = {
      'initialization': 'System',
      'domain_analysis': 'Domain Expert',
      'privacy_assessment': 'Privacy Agent',
      'bias_detection': 'Bias Detector',
      'relationship_mapping': 'Relationship Agent',
      'quality_planning': 'Quality Agent',
      'data_generation': 'Gemini AI',
      'quality_validation': 'Quality Agent',
      'final_assembly': 'System',
      'completion': 'System'
    };
    return agentMapping[step] || 'System';
  };

  // Parse specific agent completion messages
  const parseAgentMessage = (pattern: string, match: string, message: string): Partial<AgentLog> | null => {
    switch (pattern) {
      case 'domainComplete':
        return {
          type: 'domain_analysis',
          status: 'completed',
          message: `Detected ${match} domain`,
          agent: 'Domain Expert',
          metadata: { domain: match },
          level: 'success'
        };
      
      case 'privacyComplete':
        const privacyScore = parseInt(match);
        return {
          type: 'privacy_assessment',
          status: 'completed',
          message: `Privacy assessment complete: ${privacyScore}% privacy score`,
          agent: 'Privacy Agent',
          metadata: { privacyScore },
          level: 'success'
        };
      
      case 'biasComplete':
        const biasScore = parseInt(match);
        return {
          type: 'bias_detection',
          status: 'completed',
          message: `Bias analysis complete: ${biasScore}% bias score`,
          agent: 'Bias Detector',
          metadata: { biasScore },
          level: 'success'
        };
      
      case 'relationshipComplete':
        const relationshipCount = parseInt(match);
        return {
          type: 'relationship_mapping',
          status: 'completed',
          message: `Mapped ${relationshipCount} data relationships`,
          agent: 'Relationship Agent',
          metadata: { relationshipCount },
          level: 'success'
        };
      
      case 'generationComplete':
        const recordCount = parseInt(match);
        return {
          type: 'data_generation',
          status: 'completed',
          message: `Generated ${recordCount} synthetic records`,
          agent: 'Gemini AI',
          metadata: { recordCount },
          level: 'success'
        };
      
      case 'validationComplete':
        const qualityScore = parseInt(match);
        return {
          type: 'quality_validation',
          status: 'completed',
          message: `Quality validation: ${qualityScore}% overall quality`,
          agent: 'Quality Agent',
          metadata: { qualityScore },
          level: 'success'
        };
      
      default:
        return {
          type: 'initialization' as const,
          status: 'in_progress' as const,
          message: message,
          agent: 'System',
          level: 'info' as const
        };
    }
  };

  // Get agent-specific icons
  const getAgentIcon = (agent: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'System': <Cog className="w-4 h-4 text-blue-400" />,
      'Domain Expert': <Brain className="w-4 h-4 text-purple-400" />,
      'Privacy Agent': <Shield className="w-4 h-4 text-green-400" />,
      'Bias Detector': <Users className="w-4 h-4 text-orange-400" />,
      'Relationship Agent': <Search className="w-4 h-4 text-cyan-400" />,
      'Quality Agent': <Target className="w-4 h-4 text-yellow-400" />,
      'Gemini AI': <Zap className="w-4 h-4 text-pink-400" />
    };
    return iconMap[agent] || <Activity className="w-4 h-4 text-gray-400" />;
  };

  // Get status colors
  const getStatusColor = (level: string) => {
    const colorMap: Record<string, string> = {
      'success': 'bg-green-500/20 border-green-500/30 text-green-300',
      'error': 'bg-red-500/20 border-red-500/30 text-red-300',
      'warning': 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
      'info': 'bg-blue-500/20 border-blue-500/30 text-blue-300'
    };
    return colorMap[level] || 'bg-gray-500/20 border-gray-500/30 text-gray-300';
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const clearLogs = () => {
    setLogs([]);
    setCurrentProgress(0);
  };

  // Initialize with system ready message
  useEffect(() => {
    if (logs.length === 0 && !isGenerating) {
      const systemLog: AgentLog = {
        id: 'system-ready',
        timestamp: new Date(),
        type: 'initialization',
        status: 'completed',
        message: 'Multi-Agent AI System Ready for Data Generation',
        agent: 'System',
        level: 'success'
      };
      setLogs([systemLog]);
    }
  }, [logs.length, isGenerating]);

  return (
    <motion.div
      ref={dragRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl",
        isCollapsed ? "w-80" : "w-96",
        className
      )}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-700/50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <h3 className="text-lg font-semibold text-white">AI Agent Process Monitor</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isGenerating && currentProgress > 0 && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                {currentProgress}%
              </Badge>
            )}
            
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? '🔴 Live' : '⚫ Offline'}
            </Badge>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPaused(!isPaused)}
                className="h-6 w-6 p-0"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={clearLogs}
                className="h-6 w-6 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-6 w-6 p-0"
              >
                {isCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>

              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isGenerating && currentProgress > 0 && !isCollapsed && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Overall Progress</span>
              <span className="text-sm text-blue-400 font-medium">{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {logs.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-gray-400"
                  >
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">AI System Ready</p>
                    <p className="text-sm">Monitoring multi-agent orchestration</p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {logs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={`p-3 rounded-lg border ${getStatusColor(log.level)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getAgentIcon(log.agent)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-purple-400 uppercase tracking-wide">
                                {log.agent}
                              </span>
                              {log.progress !== undefined && log.progress >= 0 && (
                                <span className="text-xs opacity-75">
                                  {log.progress}%
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-200 leading-relaxed">
                              {log.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2 text-xs opacity-60">
                              <span>{log.timestamp.toLocaleTimeString()}</span>
                            </div>
                            
                            {/* Metadata badges */}
                            {log.metadata && (
                              <div className="mt-2 flex gap-2 text-xs">
                                {log.metadata.domain && (
                                  <span className="px-2 py-1 bg-purple-500/20 rounded border border-purple-500/30 text-purple-300">
                                    Domain: {log.metadata.domain}
                                  </span>
                                )}
                                {log.metadata.privacyScore && (
                                  <span className="px-2 py-1 bg-green-500/20 rounded border border-green-500/30 text-green-300">
                                    Privacy: {log.metadata.privacyScore}%
                                  </span>
                                )}
                                {log.metadata.biasScore && (
                                  <span className="px-2 py-1 bg-orange-500/20 rounded border border-orange-500/30 text-orange-300">
                                    Bias: {log.metadata.biasScore}%
                                  </span>
                                )}
                                {log.metadata.qualityScore && (
                                  <span className="px-2 py-1 bg-yellow-500/20 rounded border border-yellow-500/30 text-yellow-300">
                                    Quality: {log.metadata.qualityScore}%
                                  </span>
                                )}
                                {log.metadata.recordCount && (
                                  <span className="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30 text-blue-300">
                                    Records: {log.metadata.recordCount}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Progress indicator */}
                            {log.progress !== undefined && log.progress > 0 && log.progress < 100 && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-700/50 rounded-full h-1">
                                  <div 
                                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${log.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedRealTimeMonitor;