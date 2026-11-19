import React from 'react';
import type { RequestStatus } from '../../types/index.ts';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Pending Review':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Reviewed / Awaiting Payment':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Printing':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Ready for Delivery':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Out for Delivery':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${getBadgeStyle()} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Completed'
            ? 'bg-emerald-500'
            : status === 'Cancelled'
            ? 'bg-red-500'
            : status === 'Printing'
            ? 'bg-purple-500'
            : status === 'Out for Delivery'
            ? 'bg-orange-500'
            : status === 'Ready for Delivery'
            ? 'bg-teal-500'
            : status === 'Reviewed / Awaiting Payment'
            ? 'bg-blue-500'
            : 'bg-amber-500'
        }`}
      />
      {status}
    </span>
  );
};
