import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

function FileUploader({ onFilesSelected }) {
  const [highlight, setHighlight] = useState(false);

  const onDrop = (acceptedFiles) => {
    onFilesSelected(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'application/pdf',
    onDrop,
    onDragEnter: () => setHighlight(true),
    onDragLeave: () => setHighlight(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 p-6 rounded-lg text-center cursor-pointer transition-colors ${highlight ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      <p className="text-gray-600">Drag & drop your PDF here, or click to select</p>
    </div>
  );
}

export default FileUploader; 