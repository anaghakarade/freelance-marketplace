import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import StarRating from './StarRating';
import { reviewApi } from '../../services/api/reviewApi';
import { authService } from '../../services/authService';

export default function ReviewList({ userId }) {
  const [items, setItems] = useState([]); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState(null);
  const load = async (nextPage) => { setLoading(true); setError(''); try { const data = await reviewApi.received(userId, nextPage); const reviews = data.reviews || []; setItems(current => nextPage === 1 ? reviews : [...current, ...reviews.filter(review => !current.some(existing => existing.id === review.id))]); setPage(nextPage); } catch { setError('Unable to load reviews. Please try again.'); } finally { setLoading(false); } };
  useEffect(() => { load(1); }, [userId]);
  const save = async (event, review) => { event.preventDefault(); try { await reviewApi.update(review.id, editing.rating, editing.comment.trim()); window.dispatchEvent(new Event('reviewsChanged')); setEditing(null); load(1); } catch { setError('Unable to update your review. Please try again.'); } };
  const remove = async (review) => { if (!window.confirm('Delete this review? It will no longer appear publicly.')) return; try { await reviewApi.remove(review.id); window.dispatchEvent(new Event('reviewsChanged')); load(1); } catch { setError('Unable to delete your review. Please try again.'); } };
  if (loading && !items.length) return <p>Loading reviews…</p>;
  if (error && !items.length) return <p role="alert">{error} <button onClick={() => load(1)}>Retry</button></p>;
  if (!items.length) return <p>No reviews yet. Reviews from completed projects will appear here.</p>;
  const me = authService.getCurrentUser();
  return <section><h3>Reviews</h3>{error && <p role="alert">{error}</p>}{items.map(review => <article key={review.id} style={{ padding: '14px 0', borderTop: '1px solid var(--color-border)' }}>{editing?.id === review.id ? <form onSubmit={event => save(event, review)}><StarRating value={editing.rating} onChange={rating => setEditing({ ...editing, rating })}/><textarea value={editing.comment} maxLength={2000} onChange={event => setEditing({ ...editing, comment: event.target.value })} style={{ display: 'block', width: '100%', margin: '8px 0' }}/><button disabled={loading}>Save</button> <button type="button" onClick={() => setEditing(null)}>Cancel</button></form> : <><StarRating value={review.rating} readOnly size={16}/><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{review.comment || 'No written comment.'}</p>{review.is_verified && <small style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)' }}><BadgeCheck size={15}/> Verified WorkStream Project</small>}<small>{new Date(review.created_at).toLocaleDateString()}</small>{me?.id === review.reviewer_id && <div><button onClick={() => setEditing({ id: review.id, rating: review.rating, comment: review.comment })}>Edit review</button> <button onClick={() => remove(review)}>Delete review</button></div>}</>}</article>)}<button onClick={() => load(page + 1)} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</button></section>;
}
