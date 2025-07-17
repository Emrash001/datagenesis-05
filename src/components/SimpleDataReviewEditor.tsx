
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Download,
  Search,
  MessageSquare,
  Wand2,
  RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface SimpleDataReviewEditorProps {
  data: any[];
  onDataUpdate: (updatedData: any[]) => void;
  onPromptEdit?: (prompt: string) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

export const SimpleDataReviewEditor: React.FC<SimpleDataReviewEditorProps> = ({
  data,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false
}) => {
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const columns = localData.length > 0 ? Object.keys(localData[0]) : [];

  const filteredData = localData.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCellEdit = (rowIndex: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const updatedData = [...localData];
    updatedData[editingCell.row][editingCell.col] = editValue;
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    
    setEditingCell(null);
    setEditValue('');
    toast.success('Cell updated');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleAddRow = () => {
    if (columns.length === 0) return;
    
    const newRow = columns.reduce((acc, col) => {
      acc[col] = '';
      return acc;
    }, {} as any);
    
    const updatedData = [...localData, newRow];
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    toast.success('Row added');
  };

  const handleDeleteRows = () => {
    if (selectedRows.size === 0) return;
    
    const updatedData = localData.filter((_, index) => !selectedRows.has(index));
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    setSelectedRows(new Set());
    toast.success(`${selectedRows.size} rows deleted`);
  };

  const handlePromptSubmit = () => {
    if (!promptText.trim()) return;
    
    onPromptEdit?.(promptText);
    setPromptText('');
    toast.success('Applying AI changes...');
  };

  const handleExport = () => {
    const csv = Papa.unparse(localData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleReset = () => {
    setLocalData(data);
    onDataUpdate(data);
    setSelectedRows(new Set());
    toast.success('Data reset');
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  if (localData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No data to review</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Review & Editor</h1>
            <p className="text-muted-foreground">{localData.length} rows, {columns.length} columns</p>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleAddRow} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>

          {selectedRows.size > 0 && (
            <Button variant="destructive" onClick={handleDeleteRows}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedRows.size})
            </Button>
          )}

          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* AI Prompt */}
      <div className="border-b border-border p-4 bg-muted/50">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Describe changes you want to make... e.g., 'Make ages more realistic', 'Fix email formats'"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>
          <Button 
            onClick={handlePromptSubmit}
            disabled={!promptText.trim() || isEditing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isEditing ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Apply AI
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(Array.from({ length: filteredData.length }, (_, i) => i)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="rounded"
                />
              </th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-sm font-medium text-foreground min-w-32">
                  {col.charAt(0).toUpperCase() + col.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => toggleRowSelection(rowIndex)}
                    className="rounded"
                  />
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3">
                    {editingCell?.row === rowIndex && editingCell?.col === col ? (
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
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCellCancel} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-foreground cursor-pointer hover:bg-muted px-2 py-1 rounded min-h-[24px] flex items-center"
                        onClick={() => handleCellEdit(rowIndex, col, row[col])}
                      >
                        {String(row[col] || '').length > 50 
                          ? `${String(row[col]).substring(0, 50)}...` 
                          : String(row[col] || '-')
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

      {/* Footer */}
      <div className="border-t border-border p-4 bg-muted/50">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {filteredData.length} of {localData.length} rows
          </Badge>
          {selectedRows.size > 0 && (
            <Badge variant="secondary">
              {selectedRows.size} selected
            </Badge>
          )}
          <div className="ml-auto">
            <span className="text-sm text-muted-foreground">
              Click any cell to edit • Use AI prompt for bulk changes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDataReviewEditor;
