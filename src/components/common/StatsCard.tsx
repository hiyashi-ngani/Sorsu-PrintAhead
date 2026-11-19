import React from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  highlight = false,
}) => {
  return (
    <div
      className={`p-5 rounded-xl border transition-all ${
        highlight
          ? 'bg-[#800000] text-white border-[#5C0000] shadow-sm'
          : 'bg-white text-[#242424] border-[#E5E5E5] shadow-xs hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-xs font-semibold tracking-wider uppercase leading-snug ${
            highlight ? 'text-red-100' : 'text-gray-500'
          }`}
        >
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            highlight ? 'bg-[#5C0000] text-white' : 'bg-[#FFF5F5] text-[#800000]'
          }`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</span>
      </div>
      {subtitle && (
        <p className={`mt-1 text-xs ${highlight ? 'text-red-200' : 'text-gray-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
