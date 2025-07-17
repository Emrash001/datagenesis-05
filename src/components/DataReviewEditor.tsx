
import React from 'react';
import SimpleDataReviewEditor from './SimpleDataReviewEditor';

interface DataReviewEditorProps {
  data: any[];
  onDataUpdate: (updatedData: any[]) => void;
  onPromptEdit: (prompt: string) => void;
  isEditing?: boolean;
}

const DataReviewEditor: React.FC<DataReviewEditorProps> = (props) => {
  return <SimpleDataReviewEditor {...props} />;
};

export default DataReviewEditor;
