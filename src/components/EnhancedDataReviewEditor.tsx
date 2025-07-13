import React, { useState, useEffect } from 'react';
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
  Download,
  FileText,
  Database,
  FileSpreadsheet,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface EnhancedDataReviewEditorProps {
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

const EnhancedDataReviewEditor: React.FC<EnhancedDataReviewEditorProps> = ({
  data,
  metadata,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false
}) => {
  const [editMode, setEditMode] = useState<'manual' | 'prompt' | null>(null);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetadata, setShowMetadata] = useState(true);

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = localData.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [localData, searchTerm, sortConfig]);

  // Pagination
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleCellEdit = (rowIndex: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(currentValue));
  };

  const handleCellSave = () => {
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
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleRowDelete = (displayRowIndex: number) => {
    const actualRowIndex = (currentPage - 1) * itemsPerPage + displayRowIndex;
    const updatedData = localData.filter((_, index) => index !== actualRowIndex);
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    toast.success('Row deleted successfully');
  };

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    
    const rowIndices = Array.from(selectedRows).map(displayIndex => 
      (currentPage - 1) * itemsPerPage + displayIndex
    );
    
    const updatedData = localData.filter((_, index) => !rowIndices.includes(index));
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

    try {
      switch (format) {
        case 'csv':
          const csv = Papa.unparse(localData);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          filename = `reviewed_data_${Date.now()}.csv`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify(localData, null, 2)], { type: 'application/json' });
          filename = `reviewed_data_${Date.now()}.json`;
          break;
        case 'excel':
          const ws = XLSX.utils.json_to_sheet(localData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Reviewed Data');
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          filename = `reviewed_data_${Date.now()}.xlsx`;
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

  if (localData.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400">No data available for review</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(localData[0] || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Review & Edit Generated Data</h2>
          <p className="text-gray-400">Review, edit, and refine your synthetic data before downloading</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetadata(!showMetadata)}
            className="border-gray-600"
          >
            {showMetadata ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMetadata ? 'Hide' : 'Show'} Metrics
          </Button>
          
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-gray-600"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Quality Metrics */}
      {showMetadata && metadata && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Data Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {metadata.qualityScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{metadata.qualityScore}%</div>
                    <div className="text-sm text-gray-400">Quality</div>
                  </div>
                )}
                {metadata.privacyScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{metadata.privacyScore}%</div>
                    <div className="text-sm text-gray-400">Privacy</div>
                  </div>
                )}
                {metadata.biasScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{metadata.biasScore}%</div>
                    <div className="text-sm text-gray-400">Bias Score</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{localData.length}</div>
                  <div className="text-sm text-gray-400">Total Rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{columns.length}</div>
                  <div className="text-sm text-gray-400">Columns</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(editMode === 'manual' ? null : 'manual')}
            className={`border-blue-500/30 ${editMode === 'manual' ? 'bg-blue-500/20' : 'hover:bg-blue-500/20'}`}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Manual Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
            className={`border-purple-500/30 ${editMode === 'prompt' ? 'bg-purple-500/20' : 'hover:bg-purple-500/20'}`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetData}
            className="border-orange-500/30 hover:bg-orange-500/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          {selectedRows.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedRows.size} rows
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 bg-gray-700 border-gray-600"
          />
          <Search className="w-4 h-4 text-gray-400 -ml-8" />
        </div>
      </div>

      {/* AI Prompt Editor */}
      <AnimatePresence>
        {editMode === 'prompt' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  AI-Powered Data Editing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe how you'd like to modify the data... e.g., 'Make the ages more diverse', 'Add more variety to the names', 'Increase salary ranges', 'Fix inconsistent date formats'"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
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
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(null)}
                    className="border-gray-600 hover:bg-gray-700"
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
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-white">
              Data Table ({filteredAndSortedData.length} rows)
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20 bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {editMode === 'manual' && (
              <Button
                size="sm"
                onClick={handleAddRow}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            )}
            
            <div className="flex gap-1">
              {[
                { format: 'csv' as const, icon: FileText, label: 'CSV' },
                { format: 'json' as const, icon: Database, label: 'JSON' },
                { format: 'excel' as const, icon: FileSpreadsheet, label: 'Excel' }
              ].map(({ format, icon: Icon }) => (
                <Button
                  key={format}
                  variant={selectedFormat === format ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFormat(format)}
                  className={selectedFormat === format 
                    ? "bg-purple-500 hover:bg-purple-600" 
                    : "border-gray-600 hover:bg-gray-700"
                  }
                >
                  <Icon className="w-4 h-4" />
                </Button>
              ))}
              <Button
                onClick={() => downloadData(selectedFormat)}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 sticky top-0">
                  <tr>
                    {editMode === 'manual' && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-16">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                      </th>
                    )}
                    {editMode === 'manual' && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-20">
                        Actions
                      </th>
                    )}
                    {columns.map((key) => (
                      <th 
                        key={key} 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-600/50"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-2">
                          {key}
                          {sortConfig?.key === key && (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                      {editMode === 'manual' && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowIndex)}
                            onChange={() => handleSelectRow(rowIndex)}
                            className="rounded border-gray-600 bg-gray-700"
                          />
                        </td>
                      )}
                      {editMode === 'manual' && (
                        <td className="px-4 py-3">
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
                      {columns.map((key) => (
                        <td key={key} className="px-4 py-3">
                          {editMode === 'manual' && editingCell?.row === rowIndex && editingCell?.col === key ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm bg-gray-700 border-gray-600"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave();
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={handleCellSave}
                                className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCellCancel}
                                className="h-6 w-6 p-0 border-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className={`text-sm text-gray-300 ${
                                editMode === 'manual' ? 'cursor-pointer hover:bg-gray-600/50 px-2 py-1 rounded' : ''
                              }`}
                              onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                            >
                              {String(row[key]).length > 50 
                                ? `${String(row[key]).substring(0, 50)}...` 
                                : String(row[key]) || '-'
                              }
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-600"
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
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={page === currentPage ? "bg-purple-500" : "border-gray-600"}
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
                  className="border-gray-600"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <Badge variant="outline" className="border-gray-600">
          {localData.length} total rows
        </Badge>
        <Badge variant="outline" className="border-gray-600">
          {filteredAndSortedData.length} filtered rows
        </Badge>
        <Badge variant="outline" className="border-gray-600">
          {columns.length} columns
        </Badge>
        {editMode && (
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            {editMode} edit mode
          </Badge>
        )}
        {selectedRows.size > 0 && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
            {selectedRows.size} selected
          </Badge>
        )}
      </div>
    </motion.div>
  );
};

export default EnhancedDataReviewEditor;