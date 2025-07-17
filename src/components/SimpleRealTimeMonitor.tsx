
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { useWebSocket } from '../hooks/useWebSocket';

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  message: string;
  agent?: string;
  progress?: number;
}

interface SimpleRealTimeMonitorProps {
  isGenerating?: boolean;
  className?: string;
}

export const SimpleRealTimeMonitor: React.FC<SimpleRealTimeMonitorProps> = ({
  isGenerating = false,
  className = ''
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  const { isConnected, lastMessage } = useWebSocket('guest_user');

  // Parse messages from WebSocket
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    try {
      let logData: any = null;
      
      if (lastMessage.type === 'generation_update' && lastMessage.data) {
        logData = lastMessage.data;
      } else if (lastMessage.type === 'raw_message' && lastMessage.data?.message) {
        const message = lastMessage.data.message;
        
        // Parse progress messages
        const progressMatch = message.match(/\[(\d+)%\]\s*([^:]+):\s*(.+)/);
        if (progressMatch) {
          logData = {
            progress: parseInt(progressMatch[1]),
            step: progressMatch[2].trim(),
            message: progressMatch[3].trim()
          };
        }
      }

      if (logData) {
        const newActivity: ActivityLog = {
          id: `${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          type: detectType(logData),
          status: detectStatus(logData),
          message: logData.message || 'Processing...',
          agent: detectAgent(logData),
          progress: logData.progress
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        
        if (logData.progress !== undefined) {
          setCurrentProgress(logData.progress);
        }
      }
    } catch (error) {
      console.error('Failed to parse activity log:', error);
    }
  }, [lastMessage, isPaused]);

  const detectType = (data: any): string => {
    const message = data.message?.toLowerCase() || '';
    const step = data.step?.toLowerCase() || '';
    
    if (step.includes('domain') || message.includes('domain')) return 'domain_analysis';
    if (step.includes('privacy') || message.includes('privacy')) return 'privacy_assessment';
    if (step.includes('bias') || message.includes('bias')) return 'bias_detection';
    if (step.includes('generation') || message.includes('generating')) return 'data_generation';
    if (step.includes('quality') || message.includes('quality')) return 'quality_validation';
    return 'system';
  };

  const detectStatus = (data: any): ActivityLog['status'] => {
    if (data.progress === 100) return 'completed';
    if (data.progress === -1) return 'error';
    if (data.progress > 0) return 'in_progress';
    return 'started';
  };

  const detectAgent = (data: any): string => {
    const message = data.message?.toLowerCase() || '';
    const step = data.step?.toLowerCase() || '';
    
    if (message.includes('domain') || step.includes('domain')) return 'Domain Expert';
    if (message.includes('privacy') || step.includes('privacy')) return 'Privacy Agent';
    if (message.includes('bias') || step.includes('bias')) return 'Bias Detector';
    if (message.includes('quality') || step.includes('quality')) return 'Quality Agent';
    return 'System';
  };

  const getIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      domain_analysis: <Brain className="h-4 w-4 text-purple-400" />,
      privacy_assessment: <Shield className="h-4 w-4 text-green-400" />,
      bias_detection: <Activity className="h-4 w-4 text-orange-400" />,
      data_generation: <Zap className="h-4 w-4 text-blue-400" />,
      quality_validation: <CheckCircle className="h-4 w-4 text-green-400" />,
      system: <Activity className="h-4 w-4 text-gray-400" />
    };
    return icons[type] || icons.system;
  };

  const getStatusColor = (status: ActivityLog['status']) => {
    const colors: Record<string, string> = {
      completed: 'text-green-400',
      error: 'text-red-400',
      in_progress: 'text-blue-400',
      started: 'text-yellow-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const clearLogs = () => {
    setActivities([]);
    setCurrentProgress(0);
  };

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <h3 className="font-semibold text-foreground">
              {isCollapsed ? 'Monitor' : 'AI Activity Monitor'}
            </h3>
            {isGenerating && currentProgress > 0 && (
              <Badge variant="secondary">{currentProgress}%</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8 p-0"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={clearLogs}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isGenerating && currentProgress > 0 && !isCollapsed && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="pt-0">
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">AI System Ready</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {activities.map((activity) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(activity.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {activity.agent || 'System'}
                              </span>
                              {activity.progress !== undefined && activity.progress >= 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {activity.progress}%
                                </span>
                              )}
                              <span className={`text-xs ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {activity.message}
                            </p>
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              {activity.timestamp.toLocaleTimeString()}
                            </div>
                            
                            {/* Progress Bar for in-progress activities */}
                            {activity.progress !== undefined && activity.progress > 0 && activity.progress < 100 && (
                              <div className="mt-2">
                                <div className="w-full bg-muted rounded-full h-1">
                                  <div 
                                    className="bg-primary h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${activity.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default SimpleRealTimeMonitor;
