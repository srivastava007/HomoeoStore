import React from 'react';

export default function DateInput({ value, onChange, style, className, ...props }) {
  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const displayValue = value ? value.split('-').reverse().join('/') : '';

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: style?.width || '100%' }}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        style={{ ...style, color: 'transparent', width: '100%' }}
        className={`custom-date-input ${className || ''}`}
        {...props}
      />
      <span style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: value ? '#111827' : '#9ca3af',
        fontFamily: 'Outfit, sans-serif',
        fontSize: style?.fontSize || '14px'
      }}>
        {displayValue || 'dd/mm/yyyy'}
      </span>
    </div>
  );
}
