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
  Square
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetadata, setShowMetadata] = useState(true);

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
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

  if (!isOpen) return null;

  if (localData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No data available for review</p>
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
          <h2 className="text-2xl font-bold">Review & Edit Generated Data</h2>
          <p className="text-muted-foreground">Review, edit, and refine your synthetic data before downloading</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetadata(!showMetadata)}
          >
            {showMetadata ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMetadata ? 'Hide' : 'Show'} Metrics
          </Button>
          
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
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
          <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Data Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {metadata.qualityScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{metadata.qualityScore}%</div>
                    <div className="text-sm text-muted-foreground">Quality</div>
                  </div>
                )}
                {metadata.privacyScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{metadata.privacyScore}%</div>
                    <div className="text-sm text-muted-foreground">Privacy</div>
                  </div>
                )}
                {metadata.biasScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{metadata.biasScore}%</div>
                    <div className="text-sm text-muted-foreground">Bias Score</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{localData.length}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-500">{columns.length}</div>
                  <div className="text-sm text-muted-foreground">Columns</div>
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
            className={editMode === 'manual' ? 'bg-primary/20' : ''}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Manual Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
            className={editMode === 'prompt' ? 'bg-primary/20' : ''}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetData}
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
          <div className="relative">
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-8"
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          </div>
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
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  AI-Powered Data Editing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe how you'd like to modify the data... e.g., 'Make the ages more diverse', 'Add more variety to the names', 'Increase salary ranges', 'Fix inconsistent date formats'"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[100px]"
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
              Data Table ({filteredAndSortedData.length} rows)
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {editMode === 'manual' && (
                    <TableHead className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="p-1"
                      >
                        {selectedRows.size === paginatedData.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </TableHead>
                  )}
                  {columns.map((key) => (
                    <TableHead key={key} className="min-w-32">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(key)}
                        className="flex items-center gap-2 font-medium"
                      >
                        {key}
                        {sortConfig?.key === key && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUp className="w-3 h-3" /> : 
                            <ArrowDown className="w-3 h-3" />
                        )}
                      </Button>
                    </TableHead>
                  ))}
                  {editMode === 'manual' && (
                    <TableHead className="w-20">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {editMode === 'manual' && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectRow(rowIndex)}
                          className="p-1"
                        >
                          {selectedRows.has(rowIndex) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((key) => (
                      <TableCell key={key}>
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
                              <Save className="w-3 h-3" />
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
                            className={`text-sm ${
                              editMode === 'manual' ? 'cursor-pointer hover:bg-muted/50 px-2 py-1 rounded' : ''
                            }`}
                            onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                          >
                            {String(row[key]).length > 50 
                              ? `${String(row[key]).substring(0, 50)}...` 
                              : String(row[key]) || '-'
                            }
                          </div>
                        )}
                      </TableCell>
                    ))}
                    {editMode === 'manual' && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRowDelete(rowIndex)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
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
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
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

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Badge variant="outline">
          {localData.length} rows
        </Badge>
        <Badge variant="outline">
          {columns.length} columns
        </Badge>
        {editMode && (
          <Badge variant="outline">
            Edit mode active
          </Badge>
        )}
      </div>
    </motion.div>
  );
};

export default UnifiedDataReviewEditor;