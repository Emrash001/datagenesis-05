import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Zap, 
  Shield,
  Target,
  Users,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Eye,
  Server,
  Sparkles,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { useWebSocket } from '../hooks/useWebSocket';
import { ApiService } from '../lib/api';
import { cn } from '../lib/utils';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'initialization' | 'domain_analysis' | 'privacy_assessment' | 'bias_detection' | 'relationship_mapping' | 'quality_planning' | 'data_generation' | 'quality_validation' | 'final_assembly' | 'completion' | 'error' | 'system' | 'gemini' | 'agent';
  status: 'started' | 'in_progress' | 'completed' | 'error' | 'warning';
  message: string;
  agent?: string;
  progress?: number;
  duration?: number;
  metadata?: Record<string, any>;
  level?: 'info' | 'success' | 'warning' | 'error';
}

interface SystemStatus {
  backend: { healthy: boolean; lastCheck: Date | null; responseTime: number; };
  gemini: { status: 'online' | 'offline' | 'starting' | 'error'; model: string; tokensUsed?: number; };
  agents: { active: boolean; total: number; operational: number; currentAgent?: string; };
  websockets: { connected: boolean; status: string; };
}

interface RealTimeMonitorProps {
  className?: string;
  isGenerating?: boolean;
  position?: 'fixed' | 'static';
  compact?: boolean;
  onClose?: () => void;
}

const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ 
  className, 
  isGenerating = false,
  position = 'fixed',
  compact = false,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: { healthy: false, lastCheck: null, responseTime: 0 },
    gemini: { status: 'offline', model: 'gemini-2.0-flash-exp' },
    agents: { active: false, total: 5, operational: 0 },
    websockets: { connected: false, status: 'disconnected' }
  });
  
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { isConnected, lastMessage } = useWebSocket('guest_user');

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollAreaRef.current && !isPaused) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, isPaused]);

  // System status checker
  useEffect(() => {
    const checkSystemStatus = async () => {
      const startTime = Date.now();
      try {
        const healthResponse = await ApiService.healthCheck();
        const responseTime = Date.now() - startTime;

        setSystemStatus(prev => ({
          ...prev,
          backend: {
            healthy: healthResponse.healthy,
            lastCheck: new Date(),
            responseTime
          },
          gemini: {
            status: healthResponse.data?.services?.gemini?.status === 'ready' ? 'online' : 
                   healthResponse.data?.services?.gemini?.status === 'starting' ? 'starting' : 'offline',
            model: healthResponse.data?.services?.gemini?.model || 'gemini-2.0-flash-exp',
            tokensUsed: healthResponse.data?.services?.gemini?.tokens_used
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
        }));
      } catch (error) {
        setSystemStatus(prev => ({
          ...prev,
          backend: { healthy: false, lastCheck: new Date(), responseTime: 0 }
        }));
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  // Process WebSocket messages
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    try {
      let logData: any = null;
      
      if (lastMessage.type === 'generation_update' && lastMessage.data) {
        logData = lastMessage.data;
      } else if (lastMessage.data?.message) {
        const message = lastMessage.data.message;
        
        // Enhanced pattern matching for better log parsing
        const patterns = [
          { type: 'progress', regex: /\[(\d+)%\]\s*([^:]+):\s*(.+)/ },
          { type: 'agent_action', regex: /(🤖|🧠|🔒|⚖️|🔗|🎯|📊)\s*([^:]+):\s*(.+)/ },
          { type: 'gemini', regex: /Gemini\s+(2\.0\s+Flash|AI|Model)\s*[:-]\s*(.+)/i },
          { type: 'agent_status', regex: /(✅|🔄|❌|⚠️|🎯)\s*([^:]+)\s+Agent:\s*(.+)/i },
          { type: 'domain_expert', regex: /Domain\s+Expert[:\s]+(.+)/i },
          { type: 'privacy_agent', regex: /Privacy\s+Agent[:\s]+(.+)/i },
          { type: 'bias_detector', regex: /Bias\s+Detector[:\s]+(.+)/i },
          { type: 'quality_agent', regex: /Quality\s+Agent[:\s]+(.+)/i },
          { type: 'relationship_agent', regex: /Relationship\s+Agent[:\s]+(.+)/i },
          { type: 'system', regex: /System[:\s]+(.+)/i },
          { type: 'error', regex: /(Error|Failed|Exception)[:\s]+(.+)/i }
        ];
        
        for (const pattern of patterns) {
          const match = message.match(pattern.regex);
          if (match) {
            switch (pattern.type) {
              case 'progress':
                logData = {
                  progress: parseInt(match[1]),
                  step: match[2].trim(),
                  message: match[3].trim(),
                  type: 'progress'
                };
                break;
              case 'agent_action':
                logData = {
                  emoji: match[1],
                  agent: match[2].trim(),
                  message: match[3].trim(),
                  type: 'agent_action'
                };
                break;
              case 'gemini':
                logData = {
                  agent: 'Gemini AI',
                  message: match[2].trim(),
                  type: 'gemini'
                };
                break;
              case 'agent_status':
                logData = {
                  status: match[1],
                  agent: match[2].trim(),
                  message: match[3].trim(),
                  type: 'agent'
                };
                break;
              case 'domain_expert':
                logData = {
                  agent: 'Domain Expert',
                  message: match[1].trim(),
                  type: 'domain_analysis'
                };
                break;
              case 'privacy_agent':
                logData = {
                  agent: 'Privacy Agent',
                  message: match[1].trim(),
                  type: 'privacy_assessment'
                };
                break;
              case 'bias_detector':
                logData = {
                  agent: 'Bias Detector',
                  message: match[1].trim(),
                  type: 'bias_detection'
                };
                break;
              case 'quality_agent':
                logData = {
                  agent: 'Quality Agent',
                  message: match[1].trim(),
                  type: 'quality_planning'
                };
                break;
              case 'relationship_agent':
                logData = {
                  agent: 'Relationship Agent',
                  message: match[1].trim(),
                  type: 'relationship_mapping'
                };
                break;
              case 'error':
                logData = {
                  message: match[2].trim(),
                  type: 'error',
                  level: 'error'
                };
                break;
              default:
                logData = {
                  message: match[1] || match[2] || message,
                  type: 'system'
                };
            }
            break;
          }
        }
        
        // Fallback for unmatched messages
        if (!logData) {
          logData = { 
            message: message, 
            type: 'system',
            level: 'info'
          };
        }
      }

      if (logData) {
        const newLog: LogEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          type: detectLogType(logData),
          status: detectLogStatus(logData),
          message: logData.message || 'Processing...',
          agent: logData.agent || detectAgent(logData),
          progress: logData.progress,
          level: logData.level || detectLevel(logData),
          metadata: {
            emoji: logData.emoji,
            step: logData.step,
            raw_message: lastMessage.data?.message
          }
        };

        setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
        
        // Track active agents
        if (newLog.agent && newLog.agent !== 'System') {
          setActiveAgents(prev => new Set([...prev, newLog.agent!]));
          
          // Update system status with current agent
          setSystemStatus(prev => ({
            ...prev,
            agents: { ...prev.agents, currentAgent: newLog.agent }
          }));
        }

        // Update progress
        if (logData.progress !== undefined && logData.progress >= 0) {
          setCurrentProgress(logData.progress);
        }
      }
    } catch (error) {
      console.error('Failed to parse log message:', error);
    }
  }, [lastMessage, isPaused]);

  // Helper functions
  const detectLogType = (data: any): LogEntry['type'] => {
    if (data.type) return data.type;
    
    const message = data.message?.toLowerCase() || '';
    const step = data.step?.toLowerCase() || '';
    
    if (step.includes('initialization') || message.includes('initializing')) return 'initialization';
    if (step.includes('domain') || message.includes('domain') || data.agent === 'Domain Expert') return 'domain_analysis';
    if (step.includes('privacy') || message.includes('privacy') || data.agent === 'Privacy Agent') return 'privacy_assessment';
    if (step.includes('bias') || message.includes('bias') || data.agent === 'Bias Detector') return 'bias_detection';
    if (step.includes('relationship') || message.includes('relationship') || data.agent === 'Relationship Agent') return 'relationship_mapping';
    if (step.includes('quality') || message.includes('quality') || data.agent === 'Quality Agent') return 'quality_planning';
    if (step.includes('generation') || message.includes('generating')) return 'data_generation';
    if (step.includes('validation') || message.includes('validating')) return 'quality_validation';
    if (step.includes('assembly') || message.includes('assembling')) return 'final_assembly';
    if (step.includes('completion') || message.includes('completed')) return 'completion';
    if (message.includes('gemini') || data.agent === 'Gemini AI') return 'gemini';
    if (data.progress === -1 || message.includes('error') || message.includes('failed')) return 'error';
    return 'system';
  };

  const detectLogStatus = (data: any): LogEntry['status'] => {
    if (data.progress === 100) return 'completed';
    if (data.progress === -1 || data.level === 'error') return 'error';
    if (data.progress > 0) return 'in_progress';
    if (data.status === '✅') return 'completed';
    if (data.status === '❌') return 'error';
    if (data.status === '⚠️') return 'warning';
    return 'started';
  };

  const detectAgent = (data: any): string => {
    if (data.agent) return data.agent;
    
    const message = data.message?.toLowerCase() || '';
    
    if (message.includes('domain expert')) return 'Domain Expert';
    if (message.includes('privacy agent')) return 'Privacy Agent';
    if (message.includes('bias detector')) return 'Bias Detector';
    if (message.includes('quality agent')) return 'Quality Agent';
    if (message.includes('relationship agent')) return 'Relationship Agent';
    if (message.includes('gemini') || message.includes('2.0 flash')) return 'Gemini AI';
    
    return 'System';
  };

  const detectLevel = (data: any): LogEntry['level'] => {
    if (data.level) return data.level;
    if (data.progress === -1 || data.status === '❌') return 'error';
    if (data.progress === 100 || data.status === '✅') return 'success';
    if (data.status === '⚠️') return 'warning';
    return 'info';
  };

  const getAgentIcon = (agent: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Domain Expert': <Brain className="w-4 h-4 text-purple-400" />,
      'Privacy Agent': <Shield className="w-4 h-4 text-green-400" />,
      'Bias Detector': <Users className="w-4 h-4 text-orange-400" />,
      'Quality Agent': <Target className="w-4 h-4 text-blue-400" />,
      'Relationship Agent': <Database className="w-4 h-4 text-cyan-400" />,
      'Gemini AI': <Zap className="w-4 h-4 text-yellow-400" />,
      'System': <Server className="w-4 h-4 text-gray-400" />
    };
    return iconMap[agent] || <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (level: string, status: string) => {
    if (level === 'error' || status === 'error') return 'bg-red-500/20 border-red-500/30 text-red-300';
    if (level === 'warning' || status === 'warning') return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
    if (level === 'success' || status === 'completed') return 'bg-green-500/20 border-green-500/30 text-green-300';
    return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'in_progress': return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
      default: return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setActiveAgents(new Set());
    setCurrentProgress(0);
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
          {isConnected ? '🔴 Live' : '⚫ Offline'}
        </Badge>
        {isGenerating && currentProgress > 0 && (
          <Badge variant="outline" className="text-xs">
            {currentProgress}%
          </Badge>
        )}
      </div>
    );
  }

  const containerStyle = position === 'fixed' ? {
    position: 'fixed' as const,
    bottom: 20,
    right: 20,
    zIndex: 50,
    width: isCollapsed ? '320px' : '480px',
    maxHeight: '700px'
  } : {};

  return (
    <motion.div
      style={containerStyle}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "bg-background/95 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden",
        className
      )}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors",
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              )} />
              <CardTitle className="text-lg">
                {isGenerating ? 'Live AI Generation' : 'AI System Monitor'}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {isGenerating && currentProgress > 0 && (
                <Badge variant="outline" className="text-xs font-mono">
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
                  className="h-7 w-7 p-0"
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearLogs}
                  className="h-7 w-7 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-7 w-7 p-0"
                >
                  {isCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>

                {onClose && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isGenerating && currentProgress > 0 && !isCollapsed && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Overall Progress</span>
                <span>{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </div>
          )}
        </CardHeader>

        {/* System Status */}
        <AnimatePresence>
          {!isCollapsed && (
            <CardContent className="pt-0 space-y-4">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-2 text-xs"
              >
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border transition-colors",
                  systemStatus.backend.healthy 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                )}>
                  <Server className="w-3 h-3" />
                  <span>Backend</span>
                  <span className="ml-auto font-medium">
                    {systemStatus.backend.healthy ? 'OK' : 'Down'}
                  </span>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border transition-colors",
                  systemStatus.gemini.status === 'online' 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : systemStatus.gemini.status === 'starting'
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                )}>
                  <Zap className="w-3 h-3" />
                  <span>Gemini</span>
                  <span className="ml-auto font-medium">
                    {systemStatus.gemini.status === 'online' ? 'Ready' : 
                     systemStatus.gemini.status === 'starting' ? 'Starting' : 'Offline'}
                  </span>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border transition-colors",
                  systemStatus.agents.active 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                )}>
                  <Users className="w-3 h-3" />
                  <span>Agents</span>
                  <span className="ml-auto font-medium">
                    {systemStatus.agents.operational}/{systemStatus.agents.total}
                  </span>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border transition-colors",
                  isConnected 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                )}>
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span>WebSocket</span>
                  <span className="ml-auto font-medium">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </motion.div>

              {/* Active Agents */}
              {activeAgents.size > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    Active Agents
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(activeAgents).map((agent) => (
                      <Badge
                        key={agent}
                        variant="outline"
                        className="text-xs py-0 px-2 h-5"
                      >
                        {agent}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Activity Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Activity Logs</h4>
                  <Badge variant="outline" className="text-xs">
                    {logs.length}
                  </Badge>
                </div>
                
                <ScrollArea ref={scrollAreaRef} className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {logs.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Monitoring AI system activity...</p>
                        <p className="text-xs mt-1">Logs will appear here during generation</p>
                      </motion.div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {logs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            transition={{ duration: 0.2, delay: index * 0.01 }}
                            className={cn(
                              "p-3 rounded-lg border backdrop-blur-sm transition-all",
                              getStatusColor(log.level || 'info', log.status)
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5 flex items-center gap-1">
                                {getAgentIcon(log.agent || 'System')}
                                {getStatusIcon(log.status)}
                              </div>
                              
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">
                                    {log.agent || 'System'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {log.timestamp.toLocaleTimeString()}
                                  </span>
                                  {log.progress !== undefined && log.progress >= 0 && (
                                    <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                                      {log.progress}%
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm leading-relaxed text-foreground/90">
                                  {log.message}
                                </p>
                                
                                {/* Progress bar for in-progress tasks */}
                                {log.progress !== undefined && log.progress > 0 && log.progress < 100 && (
                                  <div className="mt-2">
                                    <Progress value={log.progress} className="h-1" />
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
              </div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default RealTimeMonitor;
