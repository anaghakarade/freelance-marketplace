import React, { useState } from 'react';
import StarRating from './StarRating';
import { reviewApi } from '../../services/api/reviewApi';

export default function ReviewForm({ contractId, onComplete }) {
  const [rating,setRating]=useState(0),[comment,setComment]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const submit=async e=>{e.preventDefault(); const text=comment.trim(); if(!rating){setError('Choose a rating from 1 to 5 stars.');return;} if(text&&text.length<10){setError('A comment must be at least 10 characters when provided.');return;} setSaving(true);setError('');try{await reviewApi.create(contractId,rating,text);onComplete?.();}catch{setError('Unable to submit your review right now. Please try again.')}finally{setSaving(false)}};
  return <form onSubmit={submit} style={{padding:20,border:'1px solid var(--color-border)',borderRadius:14,marginTop:24,background:'var(--color-surface)'}}><h3 style={{marginTop:0}}>Rate your experience</h3><StarRating value={rating} onChange={setRating}/><label htmlFor="review-comment" style={{display:'block',marginTop:14}}>Share your experience <span style={{opacity:.65}}>(optional)</span></label><textarea id="review-comment" value={comment} maxLength={2000} rows={4} onChange={e=>setComment(e.target.value)} style={{width:'100%',marginTop:6}} /><small>{comment.length}/2000</small>{error&&<p role="alert" style={{color:'#ef4444'}}>{error}</p>}<button className="btn btn-primary" disabled={saving} style={{marginTop:12}}>{saving?'Submitting…':'Submit Review'}</button></form>;
}
