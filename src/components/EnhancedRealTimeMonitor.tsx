
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Shield, 
  Zap,
  Users,
  Target,
  Database,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Cog,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle
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
    error?: string;
    duration?: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  
  const { isConnected, lastMessage } = useWebSocket('guest_user');

  // Enhanced real-time message parsing
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    try {
      console.log('📥 Raw WebSocket message:', lastMessage);
      
      const messageData = lastMessage.data;
      let parsedLog: AgentLog | null = null;

      // Handle different message formats
      if (lastMessage.type === 'generation_update' && messageData) {
        parsedLog = parseGenerationUpdate(messageData);
      } else if (lastMessage.type === 'agent_activity' && messageData) {
        parsedLog = parseAgentActivity(messageData);
      } else if (lastMessage.type === 'error' && messageData) {
        parsedLog = parseErrorMessage(messageData);
      } else if (typeof messageData === 'string') {
        parsedLog = parseTextMessage(messageData);
      }

      if (parsedLog) {
        console.log('✅ Parsed log entry:', parsedLog);
        setLogs(prev => {
          const updated = [parsedLog!, ...prev.slice(0, 49)]; // Keep last 50 logs
          return updated;
        });

        // Update progress if available
        if (parsedLog.progress !== undefined && parsedLog.progress >= 0) {
          setCurrentProgress(parsedLog.progress);
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse real-time message:', error);
      
      // Create error log entry
      const errorLog: AgentLog = {
        id: `error_${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        status: 'error',
        message: `Failed to parse message: ${error}`,
        agent: 'System',
        level: 'error',
        metadata: { error: String(error) }
      };
      
      setLogs(prev => [errorLog, ...prev.slice(0, 49)]);
    }
  }, [lastMessage, isPaused]);

  // Parse generation update messages
  const parseGenerationUpdate = (data: any): AgentLog | null => {
    const timestamp = new Date();
    const id = `gen_${timestamp.getTime()}`;

    if (data.step && data.progress !== undefined) {
      return {
        id,
        timestamp,
        type: mapStepToType(data.step),
        status: data.progress === 100 ? 'completed' : 'in_progress',
        message: data.message || `Processing ${data.step}...`,
        agent: mapStepToAgent(data.step),
        progress: data.progress,
        level: data.progress === 100 ? 'success' : 'info',
        metadata: data.metadata || {}
      };
    }

    return null;
  };

  // Parse agent activity messages
  const parseAgentActivity = (data: any): AgentLog | null => {
    const timestamp = new Date();
    const id = `agent_${timestamp.getTime()}`;

    return {
      id,
      timestamp,
      type: data.type || 'initialization',
      status: data.status || 'in_progress',
      message: data.message || 'Agent activity detected',
      agent: data.agent || 'Unknown Agent',
      progress: data.progress,
      level: data.level || 'info',
      metadata: data.metadata || {}
    };
  };

  // Parse error messages
  const parseErrorMessage = (data: any): AgentLog => {
    const timestamp = new Date();
    const id = `error_${timestamp.getTime()}`;

    return {
      id,
      timestamp,
      type: 'error',
      status: 'error',
      message: data.message || 'An error occurred',
      agent: data.agent || 'System',
      level: 'error',
      metadata: { 
        error: data.error,
        stack: data.stack,
        context: data.context
      }
    };
  };

  // Parse text-based log messages
  const parseTextMessage = (message: string): AgentLog | null => {
    const timestamp = new Date();
    const id = `text_${timestamp.getTime()}`;

    // Enhanced pattern matching for your backend logs
    const patterns = {
      initialization: /🤖\s*Initializing\s+(.*)/i,
      domainAnalysis: /🧠\s*Domain Expert analyzing/i,
      domainComplete: /✅\s*Domain Expert.*detected\s+(\w+)\s+domain/i,
      privacyStart: /🔒\s*Privacy Agent analyzing/i,
      privacyComplete: /✅\s*Privacy Agent.*(\d+)%\s+privacy/i,
      biasStart: /⚖️\s*Bias Detection Agent/i,
      biasComplete: /✅\s*Bias Detector.*(\d+)%\s+bias/i,
      relationshipStart: /🔗\s*Relationship Agent/i,
      relationshipComplete: /✅\s*Relationship Agent.*(\d+)\s+relationships/i,
      qualityStart: /🎯\s*Quality Agent/i,
      qualityComplete: /✅\s*Quality Agent.*optimized/i,
      generationStart: /🤖\s*GEMINI.*Generating/i,
      generationComplete: /✅\s*Generated\s+(\d+)\s+records/i,
      validationStart: /🔍\s*Quality Agent validating/i,
      validationComplete: /✅\s*Quality validation.*(\d+)%/i,
      completion: /🎉\s*.*generation completed/i,
      error: /❌|ERROR|Failed|Exception/i,
      warning: /⚠️|WARNING|Warn/i
    };

    // Extract progress percentage
    const progressMatch = message.match(/\[(\d+)%\]/);
    const progress = progressMatch ? parseInt(progressMatch[1]) : undefined;

    // Find matching pattern
    for (const [patternName, regex] of Object.entries(patterns)) {
      const match = message.match(regex);
      if (match) {
        const agent = extractAgentFromMessage(message);
        const type = mapPatternToType(patternName);
        
        // Extract metadata based on pattern
        const metadata: any = {};
        if (patternName.includes('domain') && match[1]) {
          metadata.domain = match[1];
        } else if (patternName.includes('privacy') && match[1]) {
          metadata.privacyScore = parseInt(match[1]);
        } else if (patternName.includes('bias') && match[1]) {
          metadata.biasScore = parseInt(match[1]);
        } else if (patternName.includes('relationship') && match[1]) {
          metadata.relationshipCount = parseInt(match[1]);
        } else if (patternName.includes('generation') && match[1]) {
          metadata.recordCount = parseInt(match[1]);
        } else if (patternName.includes('validation') && match[1]) {
          metadata.qualityScore = parseInt(match[1]);
        }

        return {
          id,
          timestamp,
          type,
          status: patternName.includes('Complete') || patternName === 'completion' ? 'completed' : 
                 patternName.includes('error') ? 'error' : 'in_progress',
          message: message.trim(),
          agent,
          progress,
          level: patternName.includes('error') ? 'error' : 
                patternName.includes('warning') ? 'warning' :
                patternName.includes('Complete') || patternName === 'completion' ? 'success' : 'info',
          metadata
        };
      }
    }

    // Default parsing for unmatched messages
    return {
      id,
      timestamp,
      type: 'initialization',
      status: 'in_progress',
      message: message.trim(),
      agent: extractAgentFromMessage(message),
      progress,
      level: 'info'
    };
  };

  // Helper functions
  const mapStepToType = (step: string): AgentLog['type'] => {
    const mapping: Record<string, AgentLog['type']> = {
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
    return mapping[step] || 'initialization';
  };

  const mapStepToAgent = (step: string): string => {
    const mapping: Record<string, string> = {
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
    return mapping[step] || 'System';
  };

  const mapPatternToType = (pattern: string): AgentLog['type'] => {
    if (pattern.includes('domain')) return 'domain_analysis';
    if (pattern.includes('privacy')) return 'privacy_assessment';
    if (pattern.includes('bias')) return 'bias_detection';
    if (pattern.includes('relationship')) return 'relationship_mapping';
    if (pattern.includes('quality')) return 'quality_planning';
    if (pattern.includes('generation')) return 'data_generation';
    if (pattern.includes('validation')) return 'quality_validation';
    if (pattern.includes('completion')) return 'completion';
    return 'initialization';
  };

  const extractAgentFromMessage = (message: string): string => {
    if (message.includes('Domain Expert')) return 'Domain Expert';
    if (message.includes('Privacy Agent')) return 'Privacy Agent';
    if (message.includes('Bias Detection') || message.includes('Bias Detector')) return 'Bias Detector';
    if (message.includes('Relationship Agent')) return 'Relationship Agent';
    if (message.includes('Quality Agent')) return 'Quality Agent';
    if (message.includes('GEMINI') || message.includes('Gemini')) return 'Gemini AI';
    return 'System';
  };

  const getAgentIcon = (agent: string) => {
    const iconMap: Record<string, any> = {
      'Domain Expert': Brain,
      'Privacy Agent': Shield,
      'Bias Detector': Users,
      'Relationship Agent': Database,
      'Quality Agent': Target,
      'Gemini AI': Zap,
      'System': Activity
    };
    const IconComponent = iconMap[agent] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'success': return 'bg-green-500/10 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.agent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAgent = selectedAgent === 'all' || log.agent === selectedAgent;
    
    return matchesSearch && matchesAgent;
  });

  const uniqueAgents = Array.from(new Set(logs.map(log => log.agent)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-4 right-4 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50",
        isCollapsed ? "w-80 h-16" : "w-96 max-h-[600px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            isConnected ? "bg-green-400" : "bg-red-400"
          )}></div>
          <h3 className="text-white font-medium">
            {isCollapsed ? "AI Monitor" : "AI Agent Performance Monitor"}
          </h3>
          <Badge variant="outline" className="text-xs">
            {logs.length} logs
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="text-gray-400 hover:text-white"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white"
          >
            {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Progress Bar */}
          {currentProgress > 0 && currentProgress < 100 && (
            <div className="p-4 border-b border-gray-700/50">
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

          {/* Filters */}
          <div className="p-4 border-b border-gray-700/50 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogs([])}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Logs */}
          <ScrollArea className="h-80">
            <div className="p-2 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isPaused ? 'Monitoring paused' : 'Waiting for agent activity...'}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        getLevelBg(log.level)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex items-center gap-2">
                          {getAgentIcon(log.agent)}
                          {getLevelIcon(log.level)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">
                              {log.agent}
                            </span>
                            <span className="text-xs text-gray-400">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            {log.progress !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {log.progress}%
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-200 leading-relaxed">
                            {log.message}
                          </p>

                          {/* Metadata */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {log.metadata.domain && (
                                <span className="text-blue-400">Domain: {log.metadata.domain}</span>
                              )}
                              {log.metadata.privacyScore !== undefined && (
                                <span className="text-green-400">Privacy: {log.metadata.privacyScore}%</span>
                              )}
                              {log.metadata.biasScore !== undefined && (
                                <span className="text-purple-400">Bias: {log.metadata.biasScore}%</span>
                              )}
                              {log.metadata.qualityScore !== undefined && (
                                <span className="text-yellow-400">Quality: {log.metadata.qualityScore}%</span>
                              )}
                              {log.metadata.recordCount && (
                                <span className="text-gray-400">Records: {log.metadata.recordCount}</span>
                              )}
                              {log.metadata.relationshipCount && (
                                <span className="text-gray-400">Relations: {log.metadata.relationshipCount}</span>
                              )}
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
        </>
      )}
    </motion.div>
  );
};

export default EnhancedRealTimeMonitor;
