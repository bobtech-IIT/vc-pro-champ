'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  isPdf: boolean;
}

interface DropzoneProps {
  onFilesSelected: (files: FileItem[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function Dropzone({ onFilesSelected, disabled = false, maxFiles = 50 }: DropzoneProps) {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incomingFiles: FileList | File[]) => {
    setError(null);
    const newItems: FileItem[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      // Check size limit (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      // Check format
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      if (!isImage && !isPdf) {
        setError(`File "${file.name}" is not a valid JPEG, PNG, or PDF.`);
        continue;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : '';
      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        file,
        previewUrl,
        isPdf,
      });
    }

    const updated = [...fileList, ...newItems].slice(0, maxFiles);
    setFileList(updated);
    onFilesSelected(updated);
  };

  const removeFile = (id: string) => {
    const updated = fileList.filter((f) => f.id !== id);
    setFileList(updated);
    onFilesSelected(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/40 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="mx-auto w-14 h-14 mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-white mb-1">
          Drop visiting cards (JPEGs / PNGs / PDFs) here
        </h3>
        <p className="text-xs text-slate-400 mb-3 max-w-sm mx-auto">
          Upload up to 50 cards or multi-card scans at once (Max 10MB per file).
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono">
          <span>Supported: JPG, PNG, PDF</span>
          <span className="text-slate-600">•</span>
          <span>10MB Limit</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Previews */}
      {fileList.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Selected Files ({fileList.length})</span>
            <button
              onClick={() => {
                setFileList([]);
                onFilesSelected([]);
              }}
              className="text-rose-400 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
            {fileList.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square flex flex-col items-center justify-center p-2 text-center"
              >
                {item.isPdf ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-8 h-8 text-rose-400 mb-1" />
                    <span className="text-[10px] text-slate-300 truncate max-w-[80px]">
                      {item.file.name}
                    </span>
                  </div>
                ) : (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(item.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-slate-300 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
