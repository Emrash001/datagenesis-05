import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Database, Download, Eye, X } from 'lucide-react';
import DataReviewEditor from '../components/DataReviewEditor';
import RealTimeMonitor from '../components/RealTimeMonitor';
import { ApiService } from '../lib/api';

interface GenerationSchema {
  [key: string]: {
    type: string;
    format?: string;
    min?: number;
    max?: number;
    values?: string[];
    category?: string;
  };
}

interface DataGeneratorConfig {
  rows: number;
  schema: GenerationSchema;
}

const DataGenerator: React.FC = () => {
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMonitor, setShowMonitor] = useState(true);
  const [generationMetadata, setGenerationMetadata] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  // Sample data configuration (you would have your actual form here)
  const [config, setConfig] = useState<DataGeneratorConfig>({
    rows: 100,
    schema: {
      patient_id: { type: 'id', format: 'ID######' },
      name: { type: 'name', format: 'full' },
      age: { type: 'number', min: 18, max: 80 },
      gender: { type: 'categorical', values: ['Male', 'Female', 'Other'] },
      admission_date: { type: 'date', format: 'YYYY-MM-DDTHH:mm:ss.SSSSSS' },
      conditions: { type: 'text', category: 'medical_conditions' }
    }
  });

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setProgress(0);
    setGeneratedData([]);
    
    try {
      const response = await ApiService.generateData({
        rows: config.rows,
        schema: config.schema,
        options: {
          quality_level: 'high',
          privacy_level: 'high',
          bias_mitigation: true
        }
      });

      if (response.success && response.data) {
        setGeneratedData(response.data.synthetic_data || []);
        setGenerationMetadata(response.data.metadata || {});
        setQualityMetrics(response.data.quality_metrics || {});
        setProgress(100);
        
        toast.success(`Successfully generated ${response.data.synthetic_data?.length || 0} records!`);
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate data. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDataUpdate = (updatedData: any[]) => {
    setGeneratedData(updatedData);
  };

  const handlePromptEdit = async (prompt: string) => {
    try {
      const response = await ApiService.editDataWithPrompt({
        data: generatedData,
        prompt: prompt,
        schema: config.schema
      });

      if (response.success && response.data) {
        setGeneratedData(response.data.synthetic_data || []);
        toast.success('Data updated successfully with AI!');
      } else {
        throw new Error(response.error || 'AI edit failed');
      }
    } catch (error) {
      console.error('AI edit error:', error);
      toast.error('Failed to apply AI changes. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            Synthetic Data Generator
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Generate high-quality synthetic data with AI-powered privacy protection, bias mitigation, and quality assurance
          </motion.p>
        </div>

        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rows to Generate</label>
                  <input
                    type="number"
                    value={config.rows}
                    onChange={(e) => setConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    min="1"
                    max="10000"
                  />
                </div>
                
                <div className="md:col-span-2 flex items-end">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Synthetic Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {generatedData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Generated Data Ready</h3>
                      <p className="text-muted-foreground">
                        {generatedData.length.toLocaleString()} records generated successfully
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowReviewModal(true)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review & Edit
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Quick CSV download
                          const csv = generatedData.map(row => 
                            Object.values(row).join(',')
                          ).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `synthetic_data_${Date.now()}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Quick Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview (First 5 rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(generatedData[0] || {}).map((key) => (
                            <th key={key} className="text-left p-2 font-medium">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {generatedData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-muted-foreground">
                                {String(value).length > 30 
                                  ? `${String(value).substring(0, 30)}...` 
                                  : String(value)
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

        {/* Review Modal */}
        <AnimatePresence>
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
                className="bg-background border rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-bold">Review & Edit Generated Data</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-6 h-[calc(90vh-120px)] overflow-auto">
                  <DataReviewEditor
                    data={generatedData}
                    metadata={{
                      qualityScore: qualityMetrics?.quality_score,
                      privacyScore: qualityMetrics?.privacy_score,
                      biasScore: qualityMetrics?.bias_score,
                      rowsGenerated: generatedData.length,
                      columnsGenerated: Object.keys(generatedData[0] || {}).length
                    }}
                    onDataUpdate={handleDataUpdate}
                    onPromptEdit={handlePromptEdit}
                    onClose={() => setShowReviewModal(false)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Monitor */}
        <RealTimeMonitor
          isGenerating={isGenerating}
          position="fixed"
          onClose={() => setShowMonitor(false)}
        />
      </div>
    </div>
  );
};

export default DataGenerator;
