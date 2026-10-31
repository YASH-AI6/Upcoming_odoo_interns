import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const norm = status.toLowerCase();

  let badgeClass = 'badge-draft';
  if (norm === 'active' || norm === 'paid') {
    badgeClass = 'badge-active';
  } else if (norm === 'confirmed' || norm === 'paused') {
    badgeClass = 'badge-confirmed';
  } else if (norm === 'closed' || norm === 'cancelled') {
    badgeClass = 'badge-closed';
  } else if (norm === 'overdue') {
    badgeClass = 'badge-overdue';
  } else if (norm === 'quotation') {
    badgeClass = 'badge-quotation';
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} />
      {status}
    </span>
  );
};
