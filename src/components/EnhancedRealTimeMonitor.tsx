
import React, { useState, useEffect } from 'react';
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
  type: 'initialization' | 'domain_analysis' | 'privacy_assessment' | 'bias_detection' | 'relationship_mapping' | 'quality_planning' | 'data_generation' | 'quality_validation' | 'final_assembly' | 'completion' | 'error' | 'websocket' | 'health';
  status: 'started' | 'in_progress' | 'completed' | 'error' | 'connected' | 'ready';
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
    stack?: string;
    context?: any;
    jobId?: string;
  };
  level: 'info' | 'success' | 'warning' | 'error';
}

interface EnhancedRealTimeMonitorProps {
  onClose?: () => void;
  className?: string;
}

export const EnhancedRealTimeMonitor: React.FC<EnhancedRealTimeMonitorProps> = ({ 
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

  // Enhanced real-time message parsing for your actual backend logs
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
          const updated = [parsedLog!, ...prev.slice(0, 99)]; // Keep last 100 logs
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
      
      setLogs(prev => [errorLog, ...prev.slice(0, 99)]);
    }
  }, [lastMessage, isPaused]);

  // Simulate backend logs for development/testing
  useEffect(() => {
    if (!isConnected) return;

    const simulateBackendLogs = () => {
      // Simulate your actual backend log patterns
      const sampleLogs = [
        "🤖 Initializing Multi-Agent Orchestrator...",
        "✅ Gemini 2.0 Flash-Lite initialized successfully",
        "✅ PrivacyAgent initialized",
        "✅ QualityAgent initialized", 
        "✅ DomainExpertAgent initialized",
        "✅ BiasDetectionAgent initialized",
        "✅ RelationshipAgent initialized",
        "🎯 Multi-Agent Orchestrator ready!",
        "🚀 Starting Multi-Agent Orchestration for job abc123",
        "🔄 [5%] initialization: 🤖 Initializing AI agents...",
        "🔄 [10%] domain_analysis: 🧠 Domain Expert analyzing data structure...",
        "🧠 Domain Expert analyzing data structure...",
        "✅ Domain Expert: Detected healthcare domain",
        "🔄 [25%] domain_analysis: ✅ Domain Expert: Detected healthcare domain",
        "🔄 [30%] privacy_assessment: 🔒 Privacy Agent assessing data sensitivity...",
        "🔒 Privacy Agent analyzing data sensitivity...",
        "✅ Privacy Agent: 60% privacy score",
        "🔄 [40%] privacy_assessment: ✅ Privacy Agent: 60% privacy score",
        "🔄 [45%] bias_detection: ⚖️ Bias Detection Agent analyzing for fairness...",
        "⚖️ Bias Detection Agent analyzing for fairness...",
        "✅ Bias Detector: 25% bias score",
        "🔄 [55%] bias_detection: ✅ Bias Detector: 25% bias score",
        "🔄 [60%] relationship_mapping: 🔗 Relationship Agent mapping data connections...",
        "🔗 Relationship Agent mapping data connections...",
        "✅ Relationship Agent: Mapped 3 relationships",
        "🔄 [70%] relationship_mapping: ✅ Relationship Agent: Mapped 3 relationships",
        "🔄 [72%] quality_planning: 🎯 Quality Agent planning generation strategy...",
        "🎯 Quality Agent planning generation strategy...",
        "✅ Quality Agent: Generation strategy optimized",
        "🔄 [75%] quality_planning: ✅ Quality Agent: Generation strategy optimized",
        "🤖 GEMINI: [80%] data_generation: 🤖 Generating synthetic data with Gemini 2.0 Flash...",
        "🤖 GEMINI: [85%] data_generation: 🔮 Gemini 2.0 Flash processing schema and constraints...",
        "🎨 Generating synthetic data with multi-agent context...",
        "✅ Generated 100 records using Gemini",
        "🤖 GEMINI: [90%] data_generation: ✅ Gemini 2.0 Flash generated 100 high-quality records",
        "🔄 [92%] quality_validation: 🔍 Quality Agent validating generated data...",
        "🔍 Quality Agent validating generated data...",
        "✅ Quality validation: 94% overall quality",
        "🔄 [95%] quality_validation: ✅ Quality validation: 94% quality",
        "🔄 [98%] final_assembly: 📦 Assembling final results...",
        "🔄 [100%] completion: 🎉 Multi-agent generation completed successfully!",
        "🎉 Multi-Agent Orchestration completed successfully!"
      ];

      let index = 0;
      const interval = setInterval(() => {
        if (index < sampleLogs.length && !isPaused) {
          const logMessage = sampleLogs[index];
          const parsedLog = parseTextMessage(logMessage);
          if (parsedLog) {
            setLogs(prev => [parsedLog, ...prev.slice(0, 99)]);
            if (parsedLog.progress !== undefined) {
              setCurrentProgress(parsedLog.progress);
            }
          }
          index++;
        } else {
          clearInterval(interval);
        }
      }, 2000); // Simulate log every 2 seconds

      return () => clearInterval(interval);
    };

    // Start simulation after a short delay
    const timeout = setTimeout(simulateBackendLogs, 3000);
    return () => clearTimeout(timeout);
  }, [isConnected, isPaused]);

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

  // Parse text-based log messages (your actual backend format)
  const parseTextMessage = (message: string): AgentLog | null => {
    const timestamp = new Date();
    const id = `text_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

    // Enhanced pattern matching for your exact backend logs
    const patterns = {
      // WebSocket patterns
      websocketConnect: /🔌\s*WebSocket connected:\s*(\w+)/i,
      websocketDisconnect: /🔌\s*WebSocket disconnected:\s*(\w+)/i,
      
      // Initialization patterns
      initialization: /🤖\s*Initializing Multi-Agent Orchestrator/i,
      geminiInit: /✅\s*Gemini.*initialized successfully/i,
      agentInit: /✅\s*(Privacy|Quality|DomainExpert|BiasDetection|Relationship)Agent initialized/i,
      orchestratorReady: /🎯\s*Multi-Agent Orchestrator ready/i,
      
      // Generation flow patterns
      orchestrationStart: /🚀\s*Starting Multi-Agent Orchestration for job\s*([a-f0-9-]+)/i,
      progressUpdate: /🔄\s*\[(\d+)%\]\s*(\w+):\s*(.*)/i,
      
      // Agent-specific patterns
      domainAnalyzing: /🧠\s*Domain Expert analyzing/i,
      domainComplete: /✅\s*Domain Expert.*[Dd]etected\s+(\w+)\s+domain/i,
      privacyAnalyzing: /🔒\s*Privacy Agent (analyzing|assessing)/i,
      privacyComplete: /✅\s*Privacy Agent.*(\d+)%\s+privacy/i,
      biasAnalyzing: /⚖️\s*Bias Detection Agent/i,
      biasComplete: /✅\s*Bias Detector.*(\d+)%\s+bias/i,
      relationshipAnalyzing: /🔗\s*Relationship Agent/i,
      relationshipComplete: /✅\s*Relationship Agent.*[Mm]apped\s+(\d+)\s+relationships/i,
      qualityPlanning: /🎯\s*Quality Agent.*planning/i,
      qualityComplete: /✅\s*Quality Agent.*optimized/i,
      
      // Generation patterns
      geminiGenerating: /🤖\s*GEMINI.*[Gg]enerating/i,
      geminiProcessing: /🔮\s*Gemini.*processing/i,
      generationContext: /🎨\s*Generating synthetic data/i,
      recordsGenerated: /✅\s*Generated\s+(\d+)\s+records/i,
      geminiComplete: /✅\s*Gemini.*generated\s+(\d+).*records/i,
      
      // Validation patterns
      validationStart: /🔍\s*Quality Agent validating/i,
      validationComplete: /✅\s*Quality validation.*(\d+)%/i,
      
      // Completion patterns
      finalAssembly: /📦\s*Assembling final results/i,
      completion: /🎉.*generation.*completed/i,
      orchestrationComplete: /🎉\s*Multi-Agent Orchestration completed/i,
      
      // Error and warning patterns
      warning: /⚠️|WARNING|[Ww]arn/i,
      error: /❌|ERROR|[Ff]ailed|[Ee]xception/i,
      
      // Health check patterns
      healthCheck: /GET.*\/api\/health.*HTTP/i,
      requestLog: /POST.*\/api\/generation/i,
    };

    // Extract progress percentage from [X%] format
    const progressMatch = message.match(/\[(\d+)%\]/);
    const progress = progressMatch ? parseInt(progressMatch[1]) : undefined;

    // Extract job ID
    const jobMatch = message.match(/job\s+([a-f0-9-]+)/i);
    const jobId = jobMatch ? jobMatch[1] : undefined;

    // Find matching pattern and create appropriate log entry
    for (const [patternName, regex] of Object.entries(patterns)) {
      const match = message.match(regex);
      if (match) {
        const agent = extractAgentFromMessage(message, patternName);
        const type = mapPatternToType(patternName);
        const status = getStatusFromPattern(patternName);
        const level = getLevelFromPattern(patternName, message);
        
        // Extract metadata based on pattern
        const metadata: any = {};
        if (jobId) metadata.jobId = jobId;
        
        if (patternName.includes('domain') && match[1]) {
          metadata.domain = match[1];
        } else if (patternName.includes('privacy') && match[1]) {
          metadata.privacyScore = parseInt(match[1]);
        } else if (patternName.includes('bias') && match[1]) {
          metadata.biasScore = parseInt(match[1]);
        } else if (patternName.includes('relationship') && match[1]) {
          metadata.relationshipCount = parseInt(match[1]);
        } else if ((patternName.includes('generated') || patternName.includes('geminiComplete')) && match[1]) {
          metadata.recordCount = parseInt(match[1]);
        } else if (patternName.includes('validation') && match[1]) {
          metadata.qualityScore = parseInt(match[1]);
        }

        return {
          id,
          timestamp,
          type,
          status,
          message: message.trim(),
          agent,
          progress,
          level,
          metadata
        };
      }
    }

    // Default parsing for unmatched messages - still create logs for visibility
    const defaultAgent = extractAgentFromMessage(message, '');
    const defaultLevel = message.includes('ERROR') || message.includes('❌') ? 'error' :
                        message.includes('WARNING') || message.includes('⚠️') ? 'warning' :
                        message.includes('✅') || message.includes('SUCCESS') ? 'success' : 'info';

    return {
      id,
      timestamp,
      type: 'initialization',
      status: defaultLevel === 'success' ? 'completed' : 'in_progress',
      message: message.trim(),
      agent: defaultAgent,
      progress,
      level: defaultLevel,
      metadata: jobId ? { jobId } : undefined
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
    if (pattern.includes('quality')) return pattern.includes('validation') ? 'quality_validation' : 'quality_planning';
    if (pattern.includes('generat') || pattern.includes('gemini')) return 'data_generation';
    if (pattern.includes('validation')) return 'quality_validation';
    if (pattern.includes('assembly')) return 'final_assembly';
    if (pattern.includes('completion') || pattern.includes('orchestrationComplete')) return 'completion';
    if (pattern.includes('websocket')) return 'websocket';
    if (pattern.includes('health') || pattern.includes('request')) return 'health';
    return 'initialization';
  };

  const getStatusFromPattern = (pattern: string): AgentLog['status'] => {
    if (pattern.includes('Complete') || pattern.includes('completion') || pattern.includes('ready')) return 'completed';
    if (pattern.includes('error') || pattern.includes('ERROR')) return 'error';
    if (pattern.includes('connect')) return 'connected';
    return 'in_progress';
  };

  const getLevelFromPattern = (pattern: string, message: string): AgentLog['level'] => {
    if (pattern.includes('error') || message.includes('ERROR') || message.includes('❌')) return 'error';
    if (pattern.includes('warning') || message.includes('WARNING') || message.includes('⚠️')) return 'warning';
    if (pattern.includes('Complete') || pattern.includes('completion') || message.includes('✅')) return 'success';
    return 'info';
  };

  const extractAgentFromMessage = (message: string, pattern: string = ''): string => {
    // Check for specific agent mentions in message
    if (message.includes('Domain Expert')) return 'Domain Expert';
    if (message.includes('Privacy Agent')) return 'Privacy Agent';
    if (message.includes('Bias Detection') || message.includes('Bias Detector')) return 'Bias Detector';
    if (message.includes('Relationship Agent')) return 'Relationship Agent';
    if (message.includes('Quality Agent')) return 'Quality Agent';
    if (message.includes('GEMINI') || message.includes('Gemini')) return 'Gemini AI';
    if (message.includes('Orchestrator')) return 'Orchestrator';
    if (pattern.includes('websocket') || message.includes('WebSocket')) return 'WebSocket';
    if (pattern.includes('health') || message.includes('health')) return 'Health Monitor';
    
    // Agent initialization patterns
    if (message.includes('PrivacyAgent initialized')) return 'Privacy Agent';
    if (message.includes('QualityAgent initialized')) return 'Quality Agent';
    if (message.includes('DomainExpertAgent initialized')) return 'Domain Expert';
    if (message.includes('BiasDetectionAgent initialized')) return 'Bias Detector';
    if (message.includes('RelationshipAgent initialized')) return 'Relationship Agent';
    
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
      'Orchestrator': Activity,
      'WebSocket': Activity,
      'Health Monitor': Activity,
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
            {isCollapsed ? "AI Monitor" : "Live AI Agent Monitor"}
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
                <span className="text-sm text-gray-300">Generation Progress</span>
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
              <Badge variant={isPaused ? "destructive" : "default"} className="text-xs">
                {isPaused ? "Paused" : "Live"}
              </Badge>
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
                              {log.metadata.relationshipCount !== undefined && (
                                <span className="text-gray-400">Relations: {log.metadata.relationshipCount}</span>
                              )}
                              {log.metadata.jobId && (
                                <span className="text-gray-500">Job: {log.metadata.jobId.substring(0, 8)}...</span>
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
