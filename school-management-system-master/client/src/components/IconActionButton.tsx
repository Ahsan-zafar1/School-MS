import React from 'react';

export interface IconActionButtonProps {
  onClick: () => void;
  tooltip: string;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Classes for the inner button (padding, borders). Defaults to compact icon padding. */
  sizeClass?: string;
  children: React.ReactNode;
}

/**
 * Icon or compact action control with a hover/focus tooltip (matches Students module styling).
 * Also sets native `title` for keyboard/mobile fallback.
 */
const IconActionButton: React.FC<IconActionButtonProps> = ({
  onClick,
  tooltip,
  className = '',
  disabled = false,
  type = 'button',
  sizeClass = 'p-1 rounded-md',
  children,
}) => {
  return (
    <div className="relative inline-flex group">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        title={tooltip}
        className={`inline-flex items-center justify-center ${sizeClass} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 z-40 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {tooltip}
      </span>
    </div>
  );
};

export default IconActionButton;
