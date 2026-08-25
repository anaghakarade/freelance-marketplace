import React from 'react';

const SkeletonCard = () => {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      height: '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '0 0 var(--space-md) 0',
    }}>
      <div style={{ width: '100%', height: '160px', background: 'rgba(255, 255, 255, 0.05)', animation: 'pulse-glow 1.5s infinite ease-in-out' }} />
      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: '80px', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
        </div>
        <div style={{ width: '90%', height: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
        <div style={{ width: '60%', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '60px', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
          <div style={{ width: '70px', height: '14px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
