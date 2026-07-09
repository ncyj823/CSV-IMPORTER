"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isBusy?: boolean;
  errorMessage?: string | null;
}

export function FileUpload({ onFileSelected, isBusy, errorMessage }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) return;
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "bg-grid group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed px-8 py-16 text-center transition-colors",
          isDragging
            ? "border-signal bg-signal-soft/40"
            : "border-base-600 bg-base-900 hover:border-base-400",
          isBusy ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full border transition-colors",
            isDragging
              ? "border-signal text-signal"
              : "border-base-600 text-base-400 group-hover:border-base-400 group-hover:text-base-200",
          ].join(" ")}
          aria-hidden
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4M12 4L7 9M12 4l5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <p className="font-display text-base font-medium text-base-50">
            Drag a CSV here, or click to browse
          </p>
          <p className="mt-1 font-mono text-xs text-base-400">
            .CSV · ANY COLUMN LAYOUT · UP TO 15MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {errorMessage && (
        <p className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
