// components/santri/Modal.tsx
'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionLabel: string;
  onAction: (e?: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  customContent?: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  actionLabel,
  onAction,
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
  customContent,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
        {customContent ? (
          <div className="mt-4">{customContent}</div>
        ) : (
          <div className="flex justify-end space-x-3 mt-4">
            {cancelLabel && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onAction}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                variant === 'danger'
                  ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
