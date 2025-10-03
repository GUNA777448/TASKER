import React, { useEffect, useState } from 'react';
import { useToast } from './ToastContext';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove();
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "relative flex items-center gap-3 min-w-80 max-w-md p-4 rounded-xl shadow-lg backdrop-blur-sm border transition-all duration-300 transform";
    
    const typeStyles = {
      success: "bg-green-50/95 border-green-200 text-green-800",
      error: "bg-red-50/95 border-red-200 text-red-800",
      warning: "bg-yellow-50/95 border-yellow-200 text-yellow-800",
      info: "bg-blue-50/95 border-blue-200 text-blue-800",
    };

    const animationStyles = isLeaving 
      ? "translate-x-full opacity-0 scale-95" 
      : isVisible 
        ? "translate-x-0 opacity-100 scale-100" 
        : "translate-x-full opacity-0 scale-95";

    return `${baseStyles} ${typeStyles[toast.type] || typeStyles.info} ${animationStyles}`;
  };

  const getIcon = () => {
    const iconStyles = "w-5 h-5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconStyles} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconStyles} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconStyles} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={`${iconStyles} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-5 break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={handleRemove}
        className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/10 transition-colors duration-200"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar for timed toasts */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-current opacity-30 rounded-b-xl transition-all ease-linear"
            style={{
              animation: `toast-progress ${toast.duration}ms linear`,
              animationDelay: '50ms'
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;