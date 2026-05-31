import React, { useState, useEffect } from 'react';

export default function RentalTimer({ endDateStr }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isDueToday, setIsDueToday] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      // Treat the end date as expiring at 23:59:59 of that day local time
      const end = new Date(endDateStr.includes('T') ? endDateStr : `${endDateStr}T23:59:59`);
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setIsOverdue(true);
        setIsDueToday(false);
        setTimeLeft('OVERDUE! Please return immediately.');
        return;
      }

      const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsOverdue(false);
      if (diffDays === 0) {
        setIsDueToday(true);
        setTimeLeft(`${diffHours}h ${diffMinutes}m ${diffSeconds}s left (Due Today!)`);
      } else {
        setIsDueToday(false);
        setTimeLeft(`${diffDays}d ${diffHours}h ${diffMinutes}m ${diffSeconds}s left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endDateStr]);

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: isOverdue 
          ? 'rgba(239, 68, 68, 0.1)' 
          : isDueToday 
            ? 'rgba(245, 158, 11, 0.1)' 
            : 'rgba(29, 158, 117, 0.1)',
        color: isOverdue 
          ? '#EF4444' 
          : isDueToday 
            ? '#F59E0B' 
            : '#1D9E75',
        border: `1px solid ${
          isOverdue 
            ? 'rgba(239, 68, 68, 0.2)' 
            : isDueToday 
              ? 'rgba(245, 158, 11, 0.2)' 
              : 'rgba(29, 158, 117, 0.2)'
        }`,
        transition: 'all 0.3s ease'
      }}
    >
      ⏱️ {timeLeft}
    </span>
  );
}
