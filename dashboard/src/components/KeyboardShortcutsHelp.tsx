/**
 * KeyboardShortcutsHelp Component
 * 
 * Modal displaying available keyboard shortcuts for accessibility.
 * Can be toggled with '?' key.
 * 
 * Requirements: 16.2 (Keyboard shortcuts documentation)
 */

import { useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEscapeKey, useFocusTrap } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal or panel' },
  { keys: ['Tab'], description: 'Navigate forward through interactive elements' },
  { keys: ['Shift', 'Tab'], description: 'Navigate backward through interactive elements' },
  { keys: ['Enter'], description: 'Activate focused button or link' },
  { keys: ['Space'], description: 'Activate focused button or checkbox' },
  { keys: ['↑', '↓'], description: 'Navigate through dropdown options' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close
  useEscapeKey(onClose, isOpen);

  // Trap focus within modal
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Keyboard size={24} className="text-racing-red" aria-hidden="true" />
              <h2 id="shortcuts-modal-title" className="text-xl font-bold text-white font-mono">
                KEYBOARD SHORTCUTS
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Close keyboard shortcuts dialog"
              title="Close (Esc)"
            >
              <X size={24} className="text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
                >
                  <span className="text-gray-300">{shortcut.description}</span>
                  <div className="flex items-center gap-2">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex} className="flex items-center gap-1">
                        {keyIndex > 0 && (
                          <span className="text-gray-500 text-sm">+</span>
                        )}
                        <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-white">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-gray-700 bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-racing-red hover:bg-racing-red/80 text-white rounded focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors min-h-[44px]"
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
