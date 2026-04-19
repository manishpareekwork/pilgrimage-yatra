"use client";

import { useEffect, useId, type ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

export function Modal({ isOpen, onClose, title, children, maxWidth = "md" }: ModalProps) {
  const titleId = useId();
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <>
      {/* Backdrop with blur effect */}
      <div
        className="modal-backdrop fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
        style={{
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Modal Container - Centered on desktop, bottom sheet on mobile */}
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`
            modal-content
            relative w-full ${maxWidthClasses[maxWidth]}
            bg-[color:var(--card)] 
            border border-[color:var(--border)]
            shadow-2xl
            /* Mobile: bottom sheet */
            rounded-t-3xl sm:rounded-2xl
            /* Desktop: centered modal */
            max-h-[85vh] sm:max-h-[90vh]
            overflow-hidden
            flex flex-col
          `}
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {/* Handle bar for mobile (visual affordance for bottom sheet) */}
          <div className="flex justify-center pt-3 pb-2 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-[color:var(--border)] opacity-60" />
          </div>

          {/* Close Button - Positioned better for both mobile and desktop */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)]/80 backdrop-blur-sm text-[color:var(--ink)] shadow-lg hover:bg-[color:var(--surface-muted)] hover:border-[color:var(--accent)] active:scale-95 transition-all duration-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title Section */}
          {title && (
            <div className="flex-shrink-0 border-b border-[color:var(--border)] px-6 sm:px-8 py-4 sm:py-5 bg-[color:var(--surface-muted)]/30">
              <h2 id={titleId} className="text-sm sm:text-base font-bold text-[color:var(--ink)] uppercase tracking-wider pr-8">
                {title}
              </h2>
            </div>
          )}

          {/* Content Section - Scrollable with proper padding */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 sm:py-6 overscroll-contain">
            <div className="min-h-0">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* CSS-in-JS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @media (min-width: 640px) {
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal-backdrop {
            animation: none !important;
          }
          .modal-content {
            animation: none !important;
          }
        }

        /* Custom scrollbar for modal content */
        .modal-content :global(*::-webkit-scrollbar) {
          width: 8px;
        }

        .modal-content :global(*::-webkit-scrollbar-track) {
          background: transparent;
        }

        .modal-content :global(*::-webkit-scrollbar-thumb) {
          background: var(--border);
          border-radius: 4px;
        }

        .modal-content :global(*::-webkit-scrollbar-thumb:hover) {
          background: var(--muted);
        }
      `}</style>
    </>
  );
}
