
/**
 * ENTERPRISE GENERATION RESULTS COMPONENT
 * Full data review, editing, and quality metrics display
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Edit, 
  Trash2,
  Database,
  BarChart3,
  Shield,
  Users,
  Target,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Brain,
  TrendingUp,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import DataReviewEditor from './DataReviewEditor';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface QualityMetrics {
  quality_score: number;
  privacy_score: number;
  bias_score: number;
  diversity_score?: number;
  coherence_score?: number;
  statistical_fidelity?: number;
}

interface GenerationMetadata {
  job_id: string;
  rows_generated: number;
  columns_generated: number;
  generation_time: string;
  model_used: string;
  provider: string;
  created_at: string;
  agents_involved?: string[];
  generation_method?: string;
}

interface EnhancedGenerationResultsProps {
  data: any[];
  metadata?: GenerationMetadata;
  qualityMetrics?: QualityMetrics;
  agentInsights?: any;
  isLoading?: boolean;
  onClear?: () => void;
  className?: string;
}

export const EnhancedGenerationResults: React.FC<EnhancedGenerationResultsProps> = ({
  data,
  metadata,
  qualityMetrics,
  isLoading = false,
  onClear,
  className
}) => {
  const [editingData, setEditingData] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Initialize editing data when data changes
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setEditingData([...data]);
    }
  }, [data]);

  const handleDownload = async (format?: 'csv' | 'json' | 'excel', customData?: any[]) => {
    const dataToExport = customData || editingData;
    const formatToUse = format || downloadFormat;
    
    if (!dataToExport || dataToExport.length === 0) {
      toast.error('No data available for download');
      return;
    }
    
    setIsDownloading(true);
    try {
      let blob: Blob;
      let filename: string;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const jobId = metadata?.job_id || 'unknown';

      switch (formatToUse) {
        case 'csv':
          const csv = Papa.unparse(dataToExport);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          filename = `synthetic_data_${jobId}_${timestamp}.csv`;
          break;
        case 'json':
          const jsonData = {
            data: dataToExport,
            metadata: metadata,
            qualityMetrics: qualityMetrics,
            exportedAt: new Date().toISOString()
          };
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          filename = `synthetic_data_${jobId}_${timestamp}.json`;
          break;
        case 'excel':
          const ws = XLSX.utils.json_to_sheet(dataToExport);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Synthetic Data');
          
          // Add metadata sheet if available
          if (metadata || qualityMetrics) {
            const metaData = {
              ...metadata,
              ...qualityMetrics,
              exportedAt: new Date().toISOString()
            };
            const metaWs = XLSX.utils.json_to_sheet([metaData]);
            XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');
          }
          
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          filename = `synthetic_data_${jobId}_${timestamp}.xlsx`;
          break;
        default:
          throw new Error('Invalid download format');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${formatToUse.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDataUpdate = (updatedData: any[]) => {
    setEditingData(updatedData);
    toast.success('Data updated successfully');
  };

  const handlePromptEdit = async (prompt: string) => {
    setIsEditing(true);
    try {
      // Send prompt-based edit request to backend
      const response = await fetch('/api/generation/edit-with-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: editingData,
          prompt: prompt,
          schema: editingData.length > 0 ? Object.keys(editingData[0]).reduce((acc, key) => {
            acc[key] = { type: typeof editingData[0][key] };
            return acc;
          }, {} as any) : {}
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setEditingData(result.data);
        toast.success('Data updated successfully with AI');
      } else {
        throw new Error('Failed to update data');
      }
    } catch (error) {
      toast.error('Failed to update data with AI');
    } finally {
      setIsEditing(false);
    }
  };

  const calculateOverallGrade = () => {
    if (!qualityMetrics) return { grade: 'N/A', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    
    const scores = [
      qualityMetrics.quality_score,
      qualityMetrics.privacy_score,
      100 - qualityMetrics.bias_score, // Convert bias to positive score (lower bias = better)
      qualityMetrics.diversity_score || 85,
      qualityMetrics.coherence_score || 80,
      qualityMetrics.statistical_fidelity || 90
    ].filter(score => score !== undefined);
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (average >= 95) return { grade: 'A+', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (average >= 90) return { grade: 'A', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (average >= 85) return { grade: 'A-', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (average >= 80) return { grade: 'B+', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (average >= 75) return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (average >= 70) return { grade: 'B-', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (average >= 65) return { grade: 'C+', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    if (average >= 60) return { grade: 'C', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-gray-800/50 border-gray-700", className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Generating synthetic data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("bg-gray-800/50 border-gray-700", className)}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">No Data Generated Yet</h3>
              <p className="text-gray-400">Configure your data generation settings and start creating synthetic data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(editingData[0] || {}).filter(key => !key.startsWith('_'));
  const overallGrade = calculateOverallGrade();
  const totalPages = Math.ceil(editingData.length / rowsPerPage);
  const paginatedData = editingData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Header with Overall Grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {qualityMetrics && (
            <div className={`px-6 py-3 rounded-xl ${overallGrade.bgColor} border border-current/20`}>
              <span className={`text-3xl font-bold ${overallGrade.color}`}>
                {overallGrade.grade}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">Generation Results</h2>
            <p className="text-gray-400">
              {editingData.length} rows • {columns.length} columns • Generated with {metadata?.model_used || 'AI'}
            </p>
            {metadata?.created_at && (
              <p className="text-sm text-gray-500">
                Created: {new Date(metadata.created_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataPreview(!showDataPreview)}
            className="border-purple-500/30 hover:bg-purple-500/20"
          >
            {showDataPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showDataPreview ? 'Hide' : 'Preview'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewModal(true)}
            className="border-blue-500/30 hover:bg-blue-500/20"
          >
            <Edit className="w-4 h-4 mr-2" />
            Review & Edit
          </Button>

          {onClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-red-500/30 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Quality Metrics Display */}
      {qualityMetrics && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Quality Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Data Quality', 
                  score: qualityMetrics.quality_score, 
                  icon: Target,
                  description: 'Overall data accuracy and completeness',
                  color: 'blue'
                },
                { 
                  label: 'Privacy Protection', 
                  score: qualityMetrics.privacy_score, 
                  icon: Shield,
                  description: 'Level of anonymization and privacy preservation',
                  color: 'green'
                },
                { 
                  label: 'Bias Mitigation', 
                  score: 100 - qualityMetrics.bias_score, // Convert to positive score
                  icon: Users,
                  description: 'Fairness and representation across demographics',
                  color: 'purple'
                },
                { 
                  label: 'Data Diversity', 
                  score: qualityMetrics.diversity_score || 85, 
                  icon: Sparkles,
                  description: 'Variety and richness of generated patterns',
                  color: 'pink'
                },
                { 
                  label: 'Coherence', 
                  score: qualityMetrics.coherence_score || 80, 
                  icon: Activity,
                  description: 'Logical consistency and relationships',
                  color: 'orange'
                },
                { 
                  label: 'Statistical Fidelity', 
                  score: qualityMetrics.statistical_fidelity || 90, 
                  icon: BarChart3,
                  description: 'Preservation of original data distributions',
                  color: 'cyan'
                }
              ].map((metric) => (
                <div key={metric.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <metric.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-300">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(metric.score)}
                      <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                        {Math.round(metric.score)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={metric.score} className="h-2" />
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Database className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{editingData.length}</p>
                <p className="text-sm text-gray-400">Records Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{columns.length}</p>
                <p className="text-sm text-gray-400">Columns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metadata?.provider || 'AI'}</p>
                <p className="text-sm text-gray-400">AI Provider</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metadata?.generation_time || 'N/A'}</p>
                <p className="text-sm text-gray-400">Generation Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      <AnimatePresence>
        {showDataPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Eye className="w-5 h-5 text-blue-400" />
                  Data Preview (First 10 rows)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {columns.map((key) => (
                          <th key={key} className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editingData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-b border-gray-700/50">
                          {columns.map((key) => (
                            <td key={key} className="px-4 py-2 text-sm text-gray-300">
                              {String(row[key] || '').length > 50 
                                ? `${String(row[key] || '').substring(0, 50)}...` 
                                : String(row[key] || '-')
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Section */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Download className="w-5 h-5 text-purple-400" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={downloadFormat} onValueChange={(value: any) => setDownloadFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => handleDownload()}
              disabled={isDownloading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download {downloadFormat.toUpperCase()}
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Badge variant="outline" className="border-gray-600">
              {editingData.length} rows
            </Badge>
            <Badge variant="outline" className="border-gray-600">
              {columns.length} columns
            </Badge>
            {qualityMetrics && (
              <Badge variant="outline" className={`border-current ${overallGrade.color}`}>
                Grade: {overallGrade.grade}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {showReviewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowReviewModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Review & Edit Generated Data</h2>
              <div className="flex items-center gap-2">
                {qualityMetrics && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">Quality: {Math.round(qualityMetrics.quality_score)}%</span>
                    <span className="text-blue-400">Privacy: {Math.round(qualityMetrics.privacy_score)}%</span>
                    <span className="text-purple-400">Bias: {Math.round(qualityMetrics.bias_score)}%</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 h-[calc(90vh-120px)] overflow-auto">
              <DataReviewEditor
                data={editingData}
                onDataUpdate={handleDataUpdate}
                onPromptEdit={handlePromptEdit}
                isEditing={isEditing}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EnhancedGenerationResults;
