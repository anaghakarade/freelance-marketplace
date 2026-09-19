import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  const [hover, setHover] = useState(0); const active = hover || value;
  return <div role={readOnly ? 'img' : 'radiogroup'} aria-label={`${value} out of 5 stars`} style={{ display:'inline-flex', gap:4 }}>
    {[1,2,3,4,5].map(star => <button key={star} type="button" disabled={readOnly} aria-label={`${star} star${star > 1 ? 's' : ''}`} aria-checked={value === star} role={readOnly ? undefined : 'radio'} onMouseEnter={()=>!readOnly&&setHover(star)} onMouseLeave={()=>setHover(0)} onClick={()=>onChange?.(star)} onKeyDown={e=>{if(!readOnly && (e.key==='ArrowRight'||e.key==='ArrowUp')) { e.preventDefault(); onChange?.(Math.min(5,value+1)); } if(!readOnly && (e.key==='ArrowLeft'||e.key==='ArrowDown')) { e.preventDefault(); onChange?.(Math.max(1,value-1)); }}} style={{ border:0, background:'transparent', padding:2, cursor:readOnly?'default':'pointer', color:star<=active?'#fbbf24':'var(--color-text-muted)', outlineOffset:2 }}><Star size={size} fill={star<=active?'currentColor':'none'} /></button>)}
  </div>;
}
