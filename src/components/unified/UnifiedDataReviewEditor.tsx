
import React, { useState, useEffect, useMemo } from 'react';
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
  Wand2,
  FileText,
  FileSpreadsheet,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Download,
  Filter,
  SortAsc,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

interface UnifiedDataReviewEditorProps {
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
  isOpen?: boolean;
}

const UnifiedDataReviewEditor: React.FC<UnifiedDataReviewEditorProps> = ({
  data,
  metadata,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false,
  isOpen = true
}) => {
  const [editMode, setEditMode] = useState<'manual' | 'prompt' | null>(null);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetadata, setShowMetadata] = useState(true);
  const [filterColumn, setFilterColumn] = useState<string>('');

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = localData.filter(row => {
      const searchMatch = searchTerm === '' || Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const columnMatch = filterColumn === '' || filterColumn === 'all' || 
        (row[filterColumn] && String(row[filterColumn]).toLowerCase().includes(searchTerm.toLowerCase()));
      
      return searchTerm === '' ? true : (filterColumn === '' || filterColumn === 'all' ? searchMatch : columnMatch);
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle different data types
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
  }, [localData, searchTerm, sortConfig, filterColumn]);

  // Pagination
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleCellEdit = (rowIndex: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const updatedData = [...localData];
      const globalRowIndex = filteredAndSortedData.indexOf(paginatedData[editingCell.row]);
      const originalRowIndex = localData.indexOf(filteredAndSortedData[globalRowIndex]);
      
      if (originalRowIndex !== -1) {
        updatedData[originalRowIndex][editingCell.col] = editValue;
        setLocalData(updatedData);
        onDataUpdate(updatedData);
        toast.success('Cell updated successfully');
      }
      
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleRowDelete = (displayRowIndex: number) => {
    const globalRowIndex = filteredAndSortedData.indexOf(paginatedData[displayRowIndex]);
    const originalRowIndex = localData.indexOf(filteredAndSortedData[globalRowIndex]);
    
    if (originalRowIndex !== -1) {
      const updatedData = localData.filter((_, index) => index !== originalRowIndex);
      setLocalData(updatedData);
      onDataUpdate(updatedData);
      toast.success('Row deleted successfully');
    }
  };

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    
    const rowsToDelete = Array.from(selectedRows).map(displayIndex => {
      const globalRowIndex = filteredAndSortedData.indexOf(paginatedData[displayIndex]);
      return localData.indexOf(filteredAndSortedData[globalRowIndex]);
    }).filter(index => index !== -1);
    
    const updatedData = localData.filter((_, index) => !rowsToDelete.includes(index));
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    setSelectedRows(new Set());
    toast.success(`${selectedRows.size} rows deleted successfully`);
  };

  const handleAddRow = () => {
    if (localData.length === 0) return;
    
    const newRow = Object.keys(localData[0]).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as any);
    
    const updatedData = [...localData, newRow];
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    toast.success('New row added');
  };

  const handlePromptSubmit = () => {
    if (promptText.trim()) {
      onPromptEdit(promptText);
      setPromptText('');
      setEditMode(null);
      toast.success('Regenerating data with your changes...');
    }
  };

  const resetData = () => {
    setLocalData(data);
    onDataUpdate(data);
    setSelectedRows(new Set());
    setSearchTerm('');
    setSortConfig(null);
    setCurrentPage(1);
    toast.success('Data reset to original');
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: paginatedData.length }, (_, i) => i)));
    }
  };

  const downloadData = (format: 'csv' | 'json' | 'excel') => {
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
          const exportData = {
            data: localData,
            metadata: metadata,
            exported_at: new Date().toISOString(),
            total_rows: localData.length,
            total_columns: Object.keys(localData[0] || {}).length
          };
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          filename = `synthetic_data_${timestamp}.json`;
          break;
        case 'excel':
          const ws = XLSX.utils.json_to_sheet(localData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Synthetic Data');
          
          if (metadata) {
            const metaWs = XLSX.utils.json_to_sheet([{
              ...metadata,
              exported_at: new Date().toISOString(),
              total_rows: localData.length,
              total_columns: Object.keys(localData[0] || {}).length
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
  };

  if (!isOpen) return null;

  if (localData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">There's no data to review or edit at the moment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = Object.keys(localData[0] || {});

  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Review & Editor</h1>
          <p className="text-muted-foreground mt-1">
            Review, edit, and refine your synthetic data with powerful tools
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetadata(!showMetadata)}
            className="border-border"
          >
            {showMetadata ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMetadata ? 'Hide' : 'Show'} Metrics
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
        {showMetadata && metadata && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Quality Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { label: 'Quality Score', value: metadata.qualityScore, color: 'text-green-600', icon: '🎯' },
                    { label: 'Privacy Score', value: metadata.privacyScore, color: 'text-blue-600', icon: '🔒' },
                    { label: 'Bias Score', value: metadata.biasScore, color: 'text-purple-600', icon: '⚖️' },
                    { label: 'Total Rows', value: localData.length, color: 'text-orange-600', icon: '📊' },
                    { label: 'Columns', value: columns.length, color: 'text-cyan-600', icon: '📋' }
                  ].map((metric) => (
                    <div key={metric.label} className="text-center p-4 rounded-lg bg-background/50">
                      <div className="text-2xl mb-1">{metric.icon}</div>
                      <div className={`text-2xl font-bold ${metric.color}`}>
                        {typeof metric.value === 'number' && metric.label.includes('Score') 
                          ? `${metric.value}%` 
                          : metric.value?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">{metric.label}</div>
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
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={editMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode(editMode === 'manual' ? null : 'manual')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Manual Edit
              </Button>
              
              <Button
                variant={editMode === 'prompt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Edit
              </Button>
              
              <Button variant="outline" size="sm" onClick={resetData}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              {editMode === 'manual' && (
                <Button size="sm" onClick={handleAddRow} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              )}

              {selectedRows.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedRows.size}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All columns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All columns</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${filterColumn || 'all columns'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => downloadData('csv')}>
                  <FileText className="w-4 h-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadData('json')}>
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadData('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Prompt Editor */}
      <AnimatePresence>
        {editMode === 'prompt' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  AI-Powered Data Editing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe how you'd like to modify the data... e.g., 'Make ages more diverse', 'Add variety to names', 'Increase salary ranges', 'Fix date formats'"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePromptSubmit}
                    disabled={!promptText.trim() || isEditing}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isEditing ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Apply AI Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Data Table
              <Badge variant="secondary">{filteredAndSortedData.length} rows</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="min-w-full">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
                  <tr>
                    {editMode === 'manual' && (
                      <th className="w-12 p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          className="p-1 h-6 w-6"
                        >
                          {selectedRows.size === paginatedData.length && paginatedData.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                    )}
                    {columns.map((key) => (
                      <th key={key} className="min-w-32 p-3 text-left font-medium border-r last:border-r-0">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(key)}
                          className="flex items-center gap-2 h-auto p-0 font-medium hover:bg-transparent"
                        >
                          <span className="truncate">{key}</span>
                          {sortConfig?.key === key && (
                            <div className="flex flex-col">
                              {sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-primary" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-primary" />
                              )}
                            </div>
                          )}
                          {sortConfig?.key !== key && (
                            <SortAsc className="w-3 h-3 text-muted-foreground/50" />
                          )}
                        </Button>
                      </th>
                    ))}
                    {editMode === 'manual' && (
                      <th className="w-20 p-3 text-left font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/50 transition-colors">
                      {editMode === 'manual' && (
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectRow(rowIndex)}
                            className="p-1 h-6 w-6"
                          >
                            {selectedRows.has(rowIndex) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      )}
                      {columns.map((key) => (
                        <td key={key} className="p-3 border-r last:border-r-0">
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
                              <Button size="sm" onClick={handleCellSave} className="h-6 w-6 p-0">
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCellCancel} className="h-6 w-6 p-0">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "text-sm py-1 px-2 rounded min-h-6 flex items-center",
                                editMode === 'manual' && "cursor-pointer hover:bg-muted/70 transition-colors"
                              )}
                              onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                            >
                              <span className="truncate max-w-48" title={String(row[key])}>
                                {String(row[key]) || '-'}
                              </span>
                            </div>
                          )}
                        </td>
                      ))}
                      {editMode === 'manual' && (
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRowDelete(rowIndex)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-background">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
                {searchTerm && ` (filtered from ${localData.length} total)`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{localData.length} total rows</Badge>
              <Badge variant="outline">{columns.length} columns</Badge>
              {searchTerm && (
                <Badge variant="outline">{filteredAndSortedData.length} filtered</Badge>
              )}
              {editMode && <Badge variant="default">Edit mode active</Badge>}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadData('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedDataReviewEditor;
