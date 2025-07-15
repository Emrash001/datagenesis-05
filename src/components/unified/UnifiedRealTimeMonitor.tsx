import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  Target,
  Search,
  Cog,
  Package,
  Users,
  Wifi,
  WifiOff,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ApiService } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'initialization' | 'domain_analysis' | 'privacy_assessment' | 'bias_detection' | 'relationship_mapping' | 'quality_planning' | 'data_generation' | 'quality_validation' | 'final_assembly' | 'completion' | 'error' | 'system';
  status: 'started' | 'in_progress' | 'completed' | 'error' | 'fallback';
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  progress?: number;
  agent?: string;
  level?: 'info' | 'success' | 'warning' | 'error';
}

interface SystemStatus {
  backend: { healthy: boolean; lastCheck: Date | null; responseTime: number; };
  gemini: { status: 'online' | 'offline' | 'unknown'; model: string; quotaPreserved: boolean; };
  agents: { active: boolean; total: number; operational: number; };
  websockets: { connected: boolean; status: string; };
}

interface UnifiedRealTimeMonitorProps {
  className?: string;
  maxLogs?: number;
  isGenerating?: boolean;
  compact?: boolean;
  collapsible?: boolean;
  position?: 'fixed' | 'static';
  showSystemStatus?: boolean;
}

export const UnifiedRealTimeMonitor: React.FC<UnifiedRealTimeMonitorProps> = ({ 
  className, 
  maxLogs = 50,
  isGenerating = false,
  compact = false,
  collapsible = true,
  position = 'static',
  showSystemStatus = true
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: { healthy: false, lastCheck: null, responseTime: 0 },
    gemini: { status: 'unknown', model: 'gemini-2.0-flash-exp', quotaPreserved: false },
    agents: { active: false, total: 5, operational: 0 },
    websockets: { connected: false, status: 'disconnected' }
  });

  const { isConnected, lastMessage } = useWebSocket('guest_user');

  // Check system status periodically
  useEffect(() => {
    const checkSystemStatus = async () => {
      const startTime = Date.now();
      try {
        const healthResponse = await ApiService.healthCheck();
        const responseTime = Date.now() - startTime;

        const newStatus: SystemStatus = {
          backend: {
            healthy: healthResponse.healthy,
            lastCheck: new Date(),
            responseTime
          },
          gemini: {
            status: healthResponse.data?.services?.gemini?.status === 'ready' ? 'online' : 'offline',
            model: healthResponse.data?.services?.gemini?.model || 'gemini-2.0-flash-exp',
            quotaPreserved: healthResponse.data?.services?.gemini?.quota_preserved || false
          },
          agents: {
            active: healthResponse.data?.services?.agents === 'active',
            total: 5,
            operational: healthResponse.data?.services?.agents === 'active' ? 5 : 0
          },
          websockets: {
            connected: isConnected,
            status: healthResponse.data?.services?.websockets || 'unknown'
          }
        };

        setSystemStatus(newStatus);
      } catch (error) {
        setSystemStatus(prev => ({
          ...prev,
          backend: { healthy: false, lastCheck: new Date(), responseTime: 0 }
        }));
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  // Parse backend log messages into activity logs
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    try {
      let logData: any = null;
      
      // Handle different message formats from WebSocket
      if (lastMessage.type === 'generation_update' && lastMessage.data) {
        logData = lastMessage.data;
      } else if (lastMessage.data?.message) {
        // Parse structured log messages
        const message = lastMessage.data.message;
        
        // Match different log patterns from backend
        const patterns = {
          progress: /\[(\d+)%\]\s*([^:]+):\s*(.+)/,
          agent: /(✅|🔄|❌|⚠️)\s*([^:]+):\s*(.+)/,
          status: /(🤖|🧠|🔒|⚖️|🔗|🎯|📦|🎉)\s*(.+)/,
          gemini: /Gemini\s+(\w+):\s*(.+)/i,
          system: /System\s+(\w+):\s*(.+)/i
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
          const match = message.match(pattern);
          if (match) {
            switch (type) {
              case 'progress':
                logData = {
                  progress: parseInt(match[1]),
                  step: match[2].trim(),
                  message: match[3].trim()
                };
                break;
              case 'agent':
                logData = {
                  status: match[1],
                  agent: match[2].trim(),
                  message: match[3].trim()
                };
                break;
              case 'gemini':
                logData = {
                  agent: 'Gemini AI',
                  status: match[1],
                  message: match[2].trim()
                };
                break;
              case 'system':
                logData = {
                  agent: 'System',
                  status: match[1],
                  message: match[2].trim()
                };
                break;
              default:
                logData = {
                  message: match[2] || match[1] || message
                };
            }
            break;
          }
        }
        
        // Fallback: use raw message
        if (!logData) {
          logData = { message: message };
        }
      }

      if (logData) {
        const newActivity: ActivityLog = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          type: detectActivityType(logData),
          status: detectStatus(logData),
          message: logData.message || 'Processing...',
          metadata: {
            progress: logData.progress,
            step: logData.step,
            agent_data: logData.agent_data,
            raw_message: lastMessage.data?.message
          },
          progress: logData.progress,
          agent: detectAgent(logData),
          level: detectLevel(logData)
        };

        setActivities(prev => {
          const updated = [newActivity, ...prev.slice(0, maxLogs - 1)];
          return updated;
        });

        if (logData.progress !== undefined && logData.progress >= 0) {
          setCurrentProgress(logData.progress);
        }
      }
    } catch (error) {
      console.error('Failed to parse activity log:', error);
    }
  }, [lastMessage, maxLogs, isPaused]);

  // Helper functions for parsing logs
  const detectActivityType = (data: any): ActivityLog['type'] => {
    const message = data.message?.toLowerCase() || '';
    const step = data.step?.toLowerCase() || '';
    
    if (step.includes('initialization') || message.includes('initializing')) return 'initialization';
    if (step.includes('domain') || message.includes('domain')) return 'domain_analysis';
    if (step.includes('privacy') || message.includes('privacy')) return 'privacy_assessment';
    if (step.includes('bias') || message.includes('bias')) return 'bias_detection';
    if (step.includes('relationship') || message.includes('relationship')) return 'relationship_mapping';
    if (step.includes('quality') || message.includes('quality')) return 'quality_planning';
    if (step.includes('generation') || message.includes('generating')) return 'data_generation';
    if (step.includes('validation') || message.includes('validating')) return 'quality_validation';
    if (step.includes('assembly') || message.includes('assembling')) return 'final_assembly';
    if (step.includes('completion') || message.includes('completed')) return 'completion';
    if (data.progress === -1 || message.includes('error') || message.includes('failed')) return 'error';
    return 'system';
  };

  const detectStatus = (data: any): ActivityLog['status'] => {
    if (data.progress === 100) return 'completed';
    if (data.progress === -1) return 'error';
    if (data.progress > 0) return 'in_progress';
    if (data.status === '✅') return 'completed';
    if (data.status === '❌') return 'error';
    if (data.status === '⚠️') return 'fallback';
    return 'started';
  };

  const detectAgent = (data: any): string => {
    if (data.agent) return data.agent;
    
    const message = data.message?.toLowerCase() || '';
    const step = data.step?.toLowerCase() || '';
    
    if (message.includes('domain expert') || step.includes('domain')) return 'Domain Expert';
    if (message.includes('privacy agent') || step.includes('privacy')) return 'Privacy Agent';
    if (message.includes('bias detector') || step.includes('bias')) return 'Bias Detector';
    if (message.includes('quality agent') || step.includes('quality')) return 'Quality Agent';
    if (message.includes('relationship agent') || step.includes('relationship')) return 'Relationship Agent';
    if (message.includes('gemini') || message.includes('2.0 flash')) return 'Gemini AI';
    if (message.includes('ollama')) return 'Ollama';
    return 'System';
  };

  const detectLevel = (data: any): ActivityLog['level'] => {
    if (data.progress === -1 || data.status === '❌') return 'error';
    if (data.progress === 100 || data.status === '✅') return 'success';
    if (data.status === '⚠️') return 'warning';
    return 'info';
  };

  // Icon helpers
  const getIcon = (type: ActivityLog['type']) => {
    const iconMap = {
      'initialization': <Cog className="h-4 w-4 text-blue-400" />,
      'domain_analysis': <Brain className="h-4 w-4 text-purple-400" />,
      'privacy_assessment': <Shield className="h-4 w-4 text-green-400" />,
      'bias_detection': <Users className="h-4 w-4 text-orange-400" />,
      'relationship_mapping': <Search className="h-4 w-4 text-cyan-400" />,
      'quality_planning': <Target className="h-4 w-4 text-yellow-400" />,
      'data_generation': <Zap className="h-4 w-4 text-pink-400" />,
      'quality_validation': <CheckCircle className="h-4 w-4 text-green-400" />,
      'final_assembly': <Package className="h-4 w-4 text-blue-400" />,
      'completion': <CheckCircle className="h-4 w-4 text-green-400" />,
      'error': <AlertCircle className="h-4 w-4 text-red-400" />,
      'system': <Activity className="h-4 w-4 text-blue-400" />
    };
    return iconMap[type] || <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (level: string) => {
    const colorMap: Record<string, string> = {
      'success': 'bg-green-500/20 border-green-500/30 text-green-300',
      'error': 'bg-red-500/20 border-red-500/30 text-red-300',
      'warning': 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
      'info': 'bg-blue-500/20 border-blue-500/30 text-blue-300'
    };
    return colorMap[level] || 'bg-gray-500/20 border-gray-500/30 text-gray-300';
  };

  const clearLogs = () => {
    setActivities([]);
    setCurrentProgress(0);
  };

  const getStepLabel = (type: string) => {
    const labels: Record<string, string> = {
      'initialization': '🤖 Initializing AI Agents',
      'domain_analysis': '🧠 Domain Expert Analysis',
      'privacy_assessment': '🔒 Privacy Assessment',
      'bias_detection': '⚖️ Bias Detection',
      'relationship_mapping': '🔗 Relationship Mapping',
      'quality_planning': '🎯 Quality Planning',
      'data_generation': '🤖 Data Generation',
      'quality_validation': '🔍 Quality Validation',
      'final_assembly': '📦 Final Assembly',
      'completion': '🎉 Generation Complete',
      'error': '❌ Error Occurred',
      'system': '⚙️ System Event'
    };
    return labels[type] || type.replace('_', ' ').toUpperCase();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <motion.div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            systemStatus.backend.healthy 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-red-500/20 text-red-300'
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {systemStatus.backend.healthy ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span>AI System</span>
        </motion.div>

        {isGenerating && currentProgress > 0 && (
          <Badge variant="outline" className="text-xs">
            {currentProgress}%
          </Badge>
        )}

        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
          {isConnected ? '🔴 Live' : '⚫ Offline'}
        </Badge>
      </div>
    );
  }

  const containerStyle = position === 'fixed' ? {
    position: 'fixed' as const,
    bottom: 16,
    right: 16,
    zIndex: 1000,
    width: '400px',
    maxHeight: '600px'
  } : {};

  return (
    <motion.div
      style={containerStyle}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-background/95 backdrop-blur-xl border rounded-xl shadow-2xl",
        className
      )}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
              <CardTitle className="text-lg">
                {isGenerating ? 'Live AI Generation' : 'AI System Monitor'}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {isGenerating && currentProgress > 0 && (
                <Badge variant="outline" className="text-xs">
                  {currentProgress}%
                </Badge>
              )}
              
              <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                {isConnected ? '🔴 Live' : '⚫ Offline'}
              </Badge>
              
              {collapsible && (
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
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {isGenerating && currentProgress > 0 && !isCollapsed && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        {/* System Status */}
        <AnimatePresence>
          {!isCollapsed && showSystemStatus && (
            <CardContent className="pt-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-2 mb-4 text-xs"
              >
                <div className={`flex items-center gap-2 p-2 rounded border ${
                  systemStatus.backend.healthy ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <Brain className="w-3 h-3" />
                  <span>Backend</span>
                  <span className={systemStatus.backend.healthy ? 'text-green-400' : 'text-red-400'}>
                    {systemStatus.backend.healthy ? 'OK' : 'Down'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 p-2 rounded border ${
                  systemStatus.gemini.status === 'online' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <Zap className="w-3 h-3" />
                  <span>Gemini</span>
                  <span className={systemStatus.gemini.status === 'online' ? 'text-purple-400' : 'text-yellow-400'}>
                    {systemStatus.gemini.status === 'online' ? 'Ready' : 'Starting'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 p-2 rounded border ${
                  systemStatus.agents.active ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-500/10 border-gray-500/30'
                }`}>
                  <Users className="w-3 h-3" />
                  <span>Agents</span>
                  <span className={systemStatus.agents.active ? 'text-blue-400' : 'text-gray-400'}>
                    {systemStatus.agents.operational}/{systemStatus.agents.total}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 p-2 rounded border ${
                  isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'
                }`}>
                  <Activity className="w-3 h-3" />
                  <span>WebSocket</span>
                  <span className={isConnected ? 'text-green-400' : 'text-gray-400'}>
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </motion.div>

              {/* Activity Logs */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Monitoring AI system activity...</p>
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {activities.slice(0, 20).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className={`p-2 rounded border ${getStatusColor(activity.level || 'info')}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-0.5">
                              {getIcon(activity.type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {getStepLabel(activity.type)}
                                </span>
                                {activity.progress !== undefined && activity.progress >= 0 && (
                                  <span className="text-xs opacity-75">
                                    {activity.progress}%
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-xs opacity-90 leading-relaxed line-clamp-2">
                                {activity.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-1 text-xs opacity-60">
                                <span>{activity.timestamp.toLocaleTimeString()}</span>
                                {activity.agent && activity.agent !== 'System' && (
                                  <span className="font-medium">{activity.agent}</span>
                                )}
                              </div>
                              
                              {/* Progress indicator for in-progress tasks */}
                              {activity.progress !== undefined && activity.progress > 0 && activity.progress < 100 && (
                                <div className="mt-1">
                                  <div className="w-full bg-gray-700/50 rounded-full h-1">
                                    <div 
                                      className="bg-current h-1 rounded-full transition-all duration-300"
                                      style={{ width: `${activity.progress}%` }}
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
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default UnifiedRealTimeMonitor;