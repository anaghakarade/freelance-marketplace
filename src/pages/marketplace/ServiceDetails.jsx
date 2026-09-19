import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';
import { orderService } from '../../services/orderService';
import { authService } from '../../services/authService';
import {
  Calendar, RefreshCw, ShieldCheck, Mail, ArrowLeft, Star,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Plus, Minus,
  Package, Zap, Award, Clock, Users, MessageSquare, Share2,
  Heart, ChevronRight, ChevronLeft, Play, ExternalLink,
  ThumbsUp, Flag, BadgeCheck, AlertCircle
} from 'lucide-react';

// ─── Mock Review Data ──────────────────────────────────────────────────────
const MOCK_REVIEWS = [
  {
    id: 'rev_1', buyerName: 'Sarah Chen', buyerAvatar: 'https://i.pravatar.cc/40?img=47',
    buyerCountry: 'Singapore', rating: 5, date: '2026-07-22',
    comment: 'Absolutely outstanding work. The designs exceeded my expectations — clean, modern, and delivered a day early. Will definitely hire again for our next sprint.',
    helpfulCount: 12, sellerReply: 'Thank you Sarah! It was a pleasure working on your SaaS product. Looking forward to the next phase!'
  },
  {
    id: 'rev_2', buyerName: 'Marcus Reeves', buyerAvatar: 'https://i.pravatar.cc/40?img=11',
    buyerCountry: 'United Kingdom', rating: 5, date: '2026-07-10',
    comment: 'The attention to detail on the component library was second to none. Figma organization is professional-grade and the prototype flows are smooth.',
    helpfulCount: 8, sellerReply: null
  },
  {
    id: 'rev_3', buyerName: 'Priya Mehta', buyerAvatar: 'https://i.pravatar.cc/40?img=5',
    buyerCountry: 'India', rating: 4, date: '2026-06-28',
    comment: 'Great work overall. Took one extra revision to get the mobile breakpoints right but the final result is polished. Responsive, great communication throughout.',
    helpfulCount: 4, sellerReply: null
  },
];

// ─── Rating Bar Component ──────────────────────────────────────────────────
const RatingBar = ({ label, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
      <span style={{ width: 20, textAlign: 'right', flexShrink: 0 }}>{label}★</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'var(--color-warning)', transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ width: 24, flexShrink: 0 }}>{count}</span>
    </div>
  );
};

// ─── Star Row ──────────────────────────────────────────────────────────────
const StarRow = ({ value, size = 14 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={size} fill={i <= value ? '#f59e0b' : 'transparent'}
        stroke={i <= value ? '#f59e0b' : 'var(--color-border-hover)'} strokeWidth={1.5} />
    ))}
  </div>
);

// ─── Feature Row in Package ────────────────────────────────────────────────
const FeatureRow = ({ label, value, included }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: 8 }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
    {value !== undefined ? (
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{value}</span>
    ) : (
      included
        ? <CheckCircle size={16} color='var(--color-accent)' />
        : <XCircle size={16} color='var(--color-text-light)' />
    )}
  </div>
);

// ─── FAQ Item ──────────────────────────────────────────────────────────────
const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: '18px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, cursor: 'pointer', textAlign: 'left',
          color: 'var(--color-text-main)', fontSize: 'var(--text-base)',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        {q}
        {open ? <ChevronUp size={17} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
          : <ChevronDown size={17} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />}
      </button>
      {open && (
        <p style={{ margin: '0 0 18px', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.75 }}>{a}</p>
      )}
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activePackage, setActivePackage] = useState('standard');
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [currentUser] = useState(authService.getCurrentUser());

  const sidebarRef = useRef(null);

  const fetchService = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const srv = await marketplaceService.getServiceById(id);
      setService(srv);
      setIsFav(srv?.isFavorite || false);
    } catch (err) {
      setFetchError(err.message || 'Failed to load service. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchService();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Loading service...
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: '0 24px' }}>
        <AlertCircle size={40} style={{ color: '#ef4444' }} />
        <h2 style={{ color: '#fff', margin: 0 }}>Unable to load service</h2>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 480 }}>
          {fetchError}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchService}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
          >
            <RefreshCw size={14} /> Retry
          </button>
          <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'var(--color-accent)', color: '#fff', borderRadius: 99, fontWeight: 600, textDecoration: 'none' }}>
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <h2>Service Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>This listing does not exist or has been removed.</p>
        <Link to="/marketplace" style={{ padding: '10px 22px', background: 'var(--color-accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const pkgKeys = ['basic', 'standard', 'premium'];
  const pkgIcons = { basic: Package, standard: Zap, premium: Award };
  const pkgColors = { basic: 'var(--color-text-muted)', standard: 'var(--color-accent)', premium: '#f59e0b' };
  const currentPkg = service.packages?.[activePackage] || null;

  const extrasTotal = selectedExtras.reduce((acc, eId) => {
    const ex = (service.extras || []).find(e => e.id === eId);
    return acc + (ex ? ex.price : 0);
  }, 0);
  const basePrice = currentPkg ? currentPkg.price : (service.startingPrice || 0);
  const totalPrice = basePrice + extrasTotal;
  const deliveryTime = selectedExtras.reduce((acc, eId) => {
    const ex = (service.extras || []).find(e => e.id === eId);
    return acc - (ex ? ex.deliveryTimeSavings || 0 : 0);
  }, currentPkg?.deliveryTime || service.deliveryDays || 3);

  const toggleExtra = (eId) => {
    setSelectedExtras(prev =>
      prev.includes(eId) ? prev.filter(id => id !== eId) : [...prev, eId]
    );
  };

  const toggleFav = () => {
    marketplaceService.toggleFavorite(service.id);
    setIsFav(v => !v);
  };

  const handleOrderRequest = () => {
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.role !== 'buyer') {
      setOrderError('Only buyer accounts can place orders. Switch to a buyer account.');
      return;
    }
    setOrderLoading(true);
    setOrderError('');
    try {
      const newOrder = orderService.createOrderRequest(service.id, activePackage, selectedExtras, service);
      setTimeout(() => {
        navigate(`/buyer?tab=orders&orderId=${newOrder.id}&step=requirements`);
      }, 600);
    } catch (err) {
      setOrderError(err.message || 'Failed to place service request.');
      setOrderLoading(false);
    }
  };

  const processSteps = service.processSteps || [
    { step: 1, title: 'Order & Brief', desc: 'You submit your order and answer a few short questions about your project goals and style preferences.' },
    { step: 2, title: 'Kickoff & Strategy', desc: 'The freelancer reviews your brief and confirms scope within 24 hours.' },
    { step: 3, title: 'Execution', desc: 'Work begins. Expect progress updates at key milestones. All files are organized professionally.' },
    { step: 4, title: 'Delivery & Revisions', desc: 'You receive final deliverables. Included revisions are yours — no questions asked.' },
  ];

  const faqs = service.faqs || [
    { q: 'Will I own the full rights to the work?', a: 'Yes. Upon full payment, all intellectual property rights are transferred to you. You own 100% of the deliverables.' },
    { q: 'What do you need from me to start?', a: 'A short project brief covering your goals, target audience, brand guidelines (if any), and style references.' },
    { q: 'Can I request changes after delivery?', a: 'Each package includes a set number of revisions. Additional rounds beyond that can be arranged as a paid add-on.' },
    { q: 'Do you offer rush delivery?', a: 'Yes. Select the 24-Hour Express Delivery add-on at checkout for an accelerated turnaround.' },
  ];

  const galleryImages = service.galleryImages || [service.coverImage];
  const totalReviews = service.reviewCount || MOCK_REVIEWS.length;
  const ratingDist = { 5: Math.round(totalReviews * 0.72), 4: Math.round(totalReviews * 0.18), 3: Math.round(totalReviews * 0.07), 2: Math.round(totalReviews * 0.02), 1: Math.round(totalReviews * 0.01) };

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh', paddingBottom: 80 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .sd-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 1024px) { .sd-grid { grid-template-columns: 1fr 360px; } }
        .pkg-tab-main { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
        .pkg-tab-main:hover { border-color: rgba(255,255,255,0.2); }
        .pkg-tab-main.active { border-color: var(--color-accent); background: rgba(16,185,129,0.08); }
        .extra-card { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.015); display: flex; align-items: center; gap: 16px; padding: 16px 20px; }
        .extra-card:hover { border-color: rgba(255,255,255,0.15); }
        .extra-card.selected { border-color: var(--color-accent); background: rgba(16,185,129,0.07); }
        .review-card { animation: fadeUp 0.4s ease both; }
        .gallery-thumb { opacity: 0.55; transition: opacity 0.2s, border-color 0.2s; border: 2px solid transparent; cursor: pointer; border-radius: 6px; overflow: hidden; }
        .gallery-thumb:hover, .gallery-thumb.active { opacity: 1; border-color: var(--color-accent); }
        .order-cta { transition: transform 0.15s, box-shadow 0.15s; }
        .order-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(16,185,129,0.3); }
        .order-cta:active { transform: translateY(0); }
      `}</style>

      <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: '32px 24px 0' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', marginBottom: 28, flexWrap: 'wrap' }}>
          <Link to="/marketplace" style={{ color: 'var(--color-text-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={13} /> Marketplace
          </Link>
          <ChevronRight size={12} />
          <Link to={`/marketplace?category=${service.categorySlug}`} style={{ color: 'var(--color-text-light)', textDecoration: 'none' }}>
            {service.categoryName}
          </Link>
          {service.subcategoryName && (
            <><ChevronRight size={12} /><span style={{ color: 'var(--color-text-muted)' }}>{service.subcategoryName}</span></>
          )}
        </div>

        <div className="sd-grid">

          {/* ════════════════════════════════════
              LEFT: Main Content
          ════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48, minWidth: 0 }}>

            {/* Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                <h1 style={{ fontSize: 'clamp(1.375rem, 3vw, 2rem)', fontWeight: 'var(--weight-bold)', lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--color-text-main)', margin: 0 }}>
                  {service.title}
                </h1>
                <button onClick={toggleFav} title={isFav ? 'Remove from saved' : 'Save service'}
                  style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={17} fill={isFav ? '#ef4444' : 'transparent'} stroke={isFav ? '#ef4444' : 'var(--color-text-muted)'} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Link to={`/seller/${service.sellerId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <img src={service.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(service.sellerName || 'A')}&background=10b981&color=fff`}
                    alt={service.sellerName}
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(16,185,129,0.4)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', fontSize: 'var(--text-sm)' }}>{service.sellerName}</span>
                      <BadgeCheck size={14} color='var(--color-accent)' />
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{service.sellerTitle || 'Professional Freelancer'}</div>
                  </div>
                </Link>
                <div style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StarRow value={Math.round(service.rating || 5)} size={14} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: '#f59e0b' }}>{(service.rating || 5).toFixed(1)}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>({service.reviewCount || 0} reviews)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  <Users size={13} /><span>{service.orderCount || 0} orders</span>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div>
              <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#111', lineHeight: 0 }}>
                <img key={galleryIdx} src={galleryImages[galleryIdx]} alt={`Gallery ${galleryIdx + 1}`}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', animation: 'fadeUp 0.3s ease both' }} />
                {galleryImages.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIdx(i => (i - 1 + galleryImages.length) % galleryImages.length)}
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setGalleryIdx(i => (i + 1) % galleryImages.length)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <ChevronRight size={18} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 12, right: 14, background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '3px 10px', fontSize: 'var(--text-xs)', color: '#fff' }}>
                      {galleryIdx + 1} / {galleryImages.length}
                    </div>
                  </>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {galleryImages.map((img, i) => (
                    <button key={i} onClick={() => setGalleryIdx(i)} className={`gallery-thumb${i === galleryIdx ? ' active' : ''}`}
                      style={{ flex: `0 0 calc(${100 / Math.min(galleryImages.length, 5)}% - 8px)`, aspectRatio: '16/9', padding: 0, background: 'none' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 16, color: 'var(--color-text-main)' }}>About This Service</h2>
              <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.8, color: 'var(--color-text-muted)', whiteSpace: 'pre-line', margin: 0 }}>{service.description}</p>
              
              {/* RIGHT LIVELIHOOD / VALUE CREATED CARD */}
              <div style={{ marginTop: 24, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px' }}>
                  <ShieldCheck size={18} />
                  <span>Work with Purpose — Value Created</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.88rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700, marginBottom: '4px' }}>Problem Solved</div>
                    <div style={{ color: 'var(--color-text-main)', lineHeight: 1.5 }}>{service.problemSolved}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700, marginBottom: '4px' }}>Who It Helps</div>
                    <div style={{ color: 'var(--color-text-main)', lineHeight: 1.5 }}>{service.whoItHelps}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700, marginBottom: '4px' }}>Lasting Value</div>
                    <div style={{ color: 'var(--color-text-main)', lineHeight: 1.5 }}>{service.valueCreated}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                {(service.tags || []).map((tag, i) => (
                  <span key={i} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-medium)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Packages */}
            {service.packages && (
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 20, color: 'var(--color-text-main)' }}>Packages</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {pkgKeys.map(key => {
                    const pkg = service.packages[key];
                    if (!pkg) return null;
                    const Icon = pkgIcons[key];
                    const isActive = activePackage === key;
                    return (
                      <button key={key} onClick={() => setActivePackage(key)}
                        className={`pkg-tab-main${isActive ? ' active' : ''}`}
                        style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <Icon size={18} color={isActive ? pkgColors[key] : 'var(--color-text-light)'} style={{ margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: isActive ? pkgColors[key] : 'var(--color-text-muted)' }}>{pkg.name}</div>
                        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-main)', marginTop: 4 }}>${pkg.price}</div>
                      </button>
                    );
                  })}
                </div>
                {currentPkg && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', animation: 'fadeUp 0.25s ease both' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', marginBottom: 6 }}>{currentPkg.title}</div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.65 }}>{currentPkg.description}</p>
                    </div>
                    <div style={{ padding: '8px 24px 20px' }}>
                      <div style={{ display: 'flex', gap: 24, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                          <Clock size={14} color='var(--color-accent)' />
                          <span><strong style={{ color: 'var(--color-text-main)' }}>{currentPkg.deliveryTime} days</strong> delivery</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                          <RefreshCw size={14} color='var(--color-accent)' />
                          <span><strong style={{ color: 'var(--color-text-main)' }}>{currentPkg.revisions}</strong> revisions</span>
                        </div>
                      </div>
                      {(currentPkg.features || []).map((f, i) => (
                        <FeatureRow key={i} label={f.label} value={f.value} included={f.included} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deliverables */}
            {service.deliverables && (
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 20, color: 'var(--color-text-main)' }}>What You Receive</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', background: 'rgba(16,185,129,0.04)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 'var(--weight-semibold)', color: 'var(--color-accent)', marginBottom: 14 }}>Included</div>
                    {(service.deliverables.included || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <CheckCircle size={15} color='var(--color-accent)' style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '1px solid rgba(239,68,68,0.12)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', background: 'rgba(239,68,68,0.03)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 'var(--weight-semibold)', color: 'var(--color-error)', marginBottom: 14 }}>Not Included</div>
                    {(service.deliverables.excluded || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <XCircle size={15} color='var(--color-error)' style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Extras */}
            {(service.extras || []).length > 0 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 6, color: 'var(--color-text-main)' }}>Enhance Your Order</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 20 }}>Optional add-ons to customize your package.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(service.extras || []).map(extra => {
                    const isSelected = selectedExtras.includes(extra.id);
                    return (
                      <label key={extra.id} className={`extra-card${isSelected ? ' selected' : ''}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleExtra(extra.id)}
                          style={{ width: 18, height: 18, accentColor: 'var(--color-accent)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', marginBottom: 3 }}>{extra.title}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{extra.description}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-base)', color: 'var(--color-accent)' }}>+${extra.price}</div>
                          {extra.deliveryTimeSavings > 0 && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>−{extra.deliveryTimeSavings}d</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Process Steps */}
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 28, color: 'var(--color-text-main)' }}>How It Works</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {processSteps.map((step, i) => (
                  <div key={i} style={{ position: 'relative', paddingLeft: 52 }}>
                    {i < processSteps.length - 1 && (
                      <div style={{ position: 'absolute', left: 19, top: 38, width: 2, height: 'calc(100% + 0px)', background: 'rgba(255,255,255,0.05)' }} />
                    )}
                    <div style={{ position: 'absolute', left: 0, top: 0, width: 38, height: 38, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                      {step.step}
                    </div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', marginBottom: 6, paddingTop: 8 }}>{step.title}</div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 8, color: 'var(--color-text-main)' }}>Frequently Asked Questions</h2>
              {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>

            {/* Reviews */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-main)', margin: 0 }}>
                  Reviews <span style={{ color: 'var(--color-text-muted)', fontWeight: 'var(--weight-normal)' }}>({totalReviews})</span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRow value={5} size={16} />
                  <span style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-2xl)', color: '#f59e0b', letterSpacing: '-0.02em' }}>{(service.rating || 5).toFixed(1)}</span>
                </div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[5, 4, 3, 2, 1].map(n => <RatingBar key={n} label={n} count={ratingDist[n]} total={totalReviews} />)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {MOCK_REVIEWS.map((rev, i) => (
                  <div key={rev.id} className="review-card" style={{ animationDelay: `${i * 0.08}s`, padding: '24px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.015)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={rev.buyerAvatar} alt={rev.buyerName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)' }}>{rev.buyerName}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{rev.buyerCountry} · {rev.date}</div>
                        </div>
                      </div>
                      <StarRow value={rev.rating} size={13} />
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.75, margin: '0 0 14px' }}>{rev.comment}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <ThumbsUp size={13} /> Helpful ({rev.helpfulCount})
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Flag size={13} /> Report
                      </button>
                    </div>
                    {rev.sellerReply && (
                      <div style={{ marginTop: 16, padding: '14px 16px', borderLeft: '3px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.04)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-accent)', marginBottom: 6 }}>Seller Response</div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.65 }}>{rev.sellerReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════
              RIGHT: Sticky Order Sidebar
          ════════════════════════════════════ */}
          <div ref={sidebarRef}>
            <div style={{ position: 'sticky', top: 88, border: '1px solid rgba(255,255,255,0.09)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: 'rgba(10,14,23,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

              {/* Package Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {pkgKeys.map(key => {
                  const pkg = service.packages?.[key];
                  if (!pkg) return null;
                  const isActive = activePackage === key;
                  return (
                    <button key={key} onClick={() => setActivePackage(key)}
                      style={{
                        flex: 1, padding: '14px 6px', background: 'none', border: 'none',
                        borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                        cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        transition: 'all 0.2s', marginBottom: -1,
                      }}>
                      {pkg.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: '24px' }}>

                {/* Price */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-main)', letterSpacing: '-0.03em' }}>${totalPrice.toLocaleString()}</span>
                    {extrasTotal > 0 && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>(${basePrice} + ${extrasTotal} extras)</span>
                    )}
                  </div>
                  {currentPkg && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>{currentPkg.title}</p>}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }}>
                  {[
                    { icon: Clock, text: <span>Delivery in <strong style={{ color: 'var(--color-text-main)' }}>{deliveryTime} day{deliveryTime !== 1 ? 's' : ''}</strong></span> },
                    { icon: RefreshCw, text: <span><strong style={{ color: 'var(--color-text-main)' }}>{currentPkg?.revisions || 2} revisions</strong> included</span> },
                    { icon: ShieldCheck, text: <span>Funds held in <strong style={{ color: 'var(--color-text-main)' }}>escrow</strong></span> },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                      <Icon size={15} color='var(--color-accent)' />{text}
                    </div>
                  ))}
                </div>

                {/* Sidebar Extras */}
                {(service.extras || []).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 10 }}>Add-Ons</div>
                    {(service.extras || []).map(extra => {
                      const isSel = selectedExtras.includes(extra.id);
                      return (
                        <label key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleExtra(extra.id)}
                            style={{ width: 15, height: 15, accentColor: 'var(--color-accent)', flexShrink: 0 }} />
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flex: 1 }}>{extra.title}</span>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-accent)', flexShrink: 0 }}>+${extra.price}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Error */}
                {orderError && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-xs)', color: '#f87171', marginBottom: 14, lineHeight: 1.5 }}>
                    {orderError}
                  </div>
                )}

                {/* CTA */}
                <button onClick={handleOrderRequest} disabled={orderLoading} className="order-cta"
                  style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', cursor: orderLoading ? 'not-allowed' : 'pointer', opacity: orderLoading ? 0.7 : 1, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {orderLoading
                    ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    : <><span>Continue</span><ChevronRight size={16} /></>}
                </button>
                <button onClick={() => navigate(`/seller/${service.sellerId}`)}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <MessageSquare size={15} /> Contact Seller
                </button>

                {/* Trust Badges */}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { icon: ShieldCheck, text: 'Secure Payment — Stripe, Card, PayPal' },
                    { icon: RefreshCw, text: 'Money-Back Guarantee' },
                    { icon: MessageSquare, text: '24/7 Customer Support' },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-light)' }}>
                      <Icon size={13} color='var(--color-accent)' style={{ flexShrink: 0 }} />{text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller Mini-Card */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 14 }}>About the Seller</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <img src={service.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(service.sellerName || 'A')}&background=10b981&color=fff`}
                    alt={service.sellerName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(16,185,129,0.3)' }} />
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', fontSize: 'var(--text-sm)', marginBottom: 2 }}>{service.sellerName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{service.sellerTitle}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <StarRow value={Math.round(service.sellerRating || 5)} size={11} />
                      <span style={{ fontSize: 'var(--text-xs)', color: '#f59e0b', fontWeight: 'var(--weight-bold)' }}>{(service.sellerRating || 5.0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <Link to={`/seller/${service.sellerId}`}
                  style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', textDecoration: 'none' }}>
                  View Full Profile <ExternalLink size={11} style={{ display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
