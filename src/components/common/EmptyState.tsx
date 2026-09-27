import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  secondaryActionLabel,
  onSecondaryAction
}) => {
  return (
    <div className="bg-[#161618] border border-dashed border-white/[0.06] rounded-[24px] p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-6">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-white/[0.08] flex items-center justify-center text-neutral-400 mb-4">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-neutral-200">{title}</h4>
      <p className="text-xs text-neutral-400 mt-1.5 max-w-md leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3 mt-5">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold rounded-full transition-colors shadow-sm"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-xs font-medium rounded-full transition-colors border border-white/[0.1]"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
