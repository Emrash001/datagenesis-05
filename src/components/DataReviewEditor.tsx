
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Download,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

interface DataReviewEditorProps {
  data: any[];
  metadata?: {
    qualityScore?: number;
    privacyScore?: number;
    biasScore?: number;
    rowsGenerated?: number;
    columnsGenerated?: number;
  };
  onDataUpdate: (updatedData: any[]) => void;
  onPromptEdit: (prompt: string) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

const DataReviewEditor: React.FC<DataReviewEditorProps> = ({
  data,
  metadata,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false
}) => {
  const [editMode, setEditMode] = useState<'view' | 'manual' | 'ai'>('view');
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetrics, setShowMetrics] = useState(true);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Memoized filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...localData];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply column filter
    if (filterColumn && filterValue) {
      filtered = filtered.filter(row => 
        String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [localData, searchTerm, sortConfig, filterColumn, filterValue]);

  // Pagination
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const columns = localData.length > 0 ? Object.keys(localData[0]) : [];

  const handleCellEdit = useCallback((rowIndex: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(currentValue || ''));
  }, []);

  const handleCellSave = useCallback(() => {
    if (editingCell) {
      const updatedData = [...localData];
      const actualRowIndex = (currentPage - 1) * itemsPerPage + editingCell.row;
      updatedData[actualRowIndex][editingCell.col] = editValue;
      
      setLocalData(updatedData);
      onDataUpdate(updatedData);
      
      setEditingCell(null);
      setEditValue('');
      toast.success('Cell updated successfully');
    }
  }, [editingCell, editValue, localData, currentPage, itemsPerPage, onDataUpdate]);

  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handlePromptSubmit = useCallback(() => {
    if (promptText.trim()) {
      onPromptEdit(promptText);
      setPromptText('');
      setEditMode('view');
      toast.success('Applying AI edits to your data...');
    }
  }, [promptText, onPromptEdit]);

  const downloadData = useCallback((format: 'csv' | 'json' | 'excel') => {
    if (!localData.length) return;

    let blob: Blob;
    let filename: string;
    const timestamp = new Date().toISOString().split('T')[0];

    try {
      switch (format) {
        case 'csv':
          const csv = Papa.unparse(localData);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          filename = `synthetic_data_${timestamp}.csv`;
          break;
        case 'json':
          const jsonData = {
            data: localData,
            metadata,
            exportedAt: new Date().toISOString()
          };
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          filename = `synthetic_data_${timestamp}.json`;
          break;
        case 'excel':
          const ws = XLSX.utils.json_to_sheet(localData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Synthetic Data');
          
          if (metadata) {
            const metaWs = XLSX.utils.json_to_sheet([{
              ...metadata,
              totalRows: localData.length,
              totalColumns: columns.length,
              exportedAt: new Date().toISOString()
            }]);
            XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');
          }
          
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          filename = `synthetic_data_${timestamp}.xlsx`;
          break;
        default:
          return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  }, [localData, metadata, columns.length]);

  if (localData.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No Data to Review</h3>
              <p className="text-muted-foreground">Generate some synthetic data first to start reviewing and editing.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review & Edit Data</h1>
          <p className="text-muted-foreground mt-1">
            Review, edit, and refine your {localData.length.toLocaleString()} synthetic records
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetrics(!showMetrics)}
          >
            {showMetrics ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </Button>
          
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Quality Metrics */}
      <AnimatePresence>
        {showMetrics && metadata && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Data Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { 
                      label: 'Quality Score', 
                      value: metadata.qualityScore, 
                      color: 'text-green-600 dark:text-green-400',
                      suffix: '%'
                    },
                    { 
                      label: 'Privacy Score', 
                      value: metadata.privacyScore, 
                      color: 'text-blue-600 dark:text-blue-400',
                      suffix: '%'
                    },
                    { 
                      label: 'Bias Score', 
                      value: metadata.biasScore, 
                      color: 'text-purple-600 dark:text-purple-400',
                      suffix: '%'
                    },
                    { 
                      label: 'Total Rows', 
                      value: localData.length, 
                      color: 'text-orange-600 dark:text-orange-400',
                      suffix: ''
                    },
                    { 
                      label: 'Columns', 
                      value: columns.length, 
                      color: 'text-cyan-600 dark:text-cyan-400',
                      suffix: ''
                    }
                  ].map((metric) => (
                    <div key={metric.label} className="text-center">
                      <div className={`text-3xl font-bold ${metric.color} mb-1`}>
                        {metric.value?.toLocaleString()}{metric.suffix}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Edit Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={editMode === 'view' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('view')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Mode
              </Button>
              
              <Button
                variant={editMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('manual')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Manual Edit
              </Button>
              
              <Button
                variant={editMode === 'ai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('ai')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Edit
              </Button>

              <Separator orientation="vertical" className="h-8" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalData(data);
                  onDataUpdate(data);
                  setSelectedRows(new Set());
                  toast.success('Data reset to original');
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
              
              <Select value={filterColumn} onValueChange={setFilterColumn}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All columns</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {filterColumn && (
                <Input
                  placeholder={`Filter ${filterColumn}...`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-40"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Edit Panel */}
      <AnimatePresence>
        {editMode === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI-Powered Data Editing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe your changes in natural language... 

Examples:
• 'Make the ages more diverse, ranging from 18 to 85'
• 'Add more variety to the names with different ethnicities'
• 'Increase salary ranges and make them more realistic'
• 'Fix any inconsistent date formats to YYYY-MM-DD'
• 'Make the data more balanced across all categories'"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePromptSubmit}
                    disabled={!promptText.trim() || isEditing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying Changes...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Apply AI Changes
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode('view')}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>
              Data Table
            </CardTitle>
            <Badge variant="outline">
              {filteredAndSortedData.length.toLocaleString()} rows
            </Badge>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadData('csv')}
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadData('json')}
            >
              JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadData('excel')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-[600px] w-full">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="sticky top-0 bg-muted/50 backdrop-blur border-b z-10">
                  <div className="flex min-w-max">
                    {editMode === 'manual' && (
                      <div className="w-12 p-4 flex items-center justify-center border-r">
                        <Checkbox />
                      </div>
                    )}
                    {columns.map((key) => (
                      <div 
                        key={key} 
                        className="min-w-[200px] p-4 border-r last:border-r-0 font-medium"
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(key)}
                          className="flex items-center gap-2 h-auto p-0 font-medium hover:bg-transparent"
                        >
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                          {sortConfig?.key === key && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="w-3 h-3" /> : 
                              <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {editMode === 'manual' && (
                      <div className="w-20 p-4 text-center font-medium">
                        Actions
                      </div>
                    )}
                  </div>
                </div>

                {/* Table Body */}
                <div>
                  {paginatedData.map((row, rowIndex) => (
                    <div 
                      key={`row-${rowIndex}`} 
                      className="flex min-w-max hover:bg-muted/30 transition-colors"
                    >
                      {editMode === 'manual' && (
                        <div className="w-12 p-4 flex items-center justify-center border-r">
                          <Checkbox />
                        </div>
                      )}
                      {columns.map((key) => (
                        <div 
                          key={`${rowIndex}-${key}`} 
                          className="min-w-[200px] p-4 border-r last:border-r-0"
                        >
                          {editMode === 'manual' && editingCell?.row === rowIndex && editingCell?.col === key ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave();
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={handleCellSave}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCellCancel}
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "text-sm truncate",
                                editMode === 'manual' && "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                              )}
                              onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                              title={String(row[key] || '')}
                            >
                              {String(row[key] || '').length > 50 
                                ? `${String(row[key] || '').substring(0, 50)}...` 
                                : String(row[key] || '—')
                              }
                            </div>
                          )}
                        </div>
                      ))}
                      {editMode === 'manual' && (
                        <div className="w-20 p-4 flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCellEdit(rowIndex, columns[0], row[columns[0]])}
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataReviewEditor;
