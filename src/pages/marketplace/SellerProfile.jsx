import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { marketplaceService } from '../../services/marketplaceService';
import Rating from '../../components/ui/Rating';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { MapPin, Globe, CheckCircle2, Calendar, ArrowLeft, ShieldCheck, Award, Clock, Sparkles } from 'lucide-react';
import TrustProfile from '../../components/reviews/TrustProfile';
import ReviewList from '../../components/reviews/ReviewList';

const SellerProfile = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSellerData() {
      const user = userService.getUserById(id);
      if (!isMounted) return;
      setSeller(user);
      if (user) {
        try {
          const allServices = await marketplaceService.getServices();
          if (isMounted) {
            setServices((allServices || []).filter(s => s.sellerId === user.id));
          }
        } catch (err) {
          console.error('[SellerProfile] Failed to load services:', err);
        }
      }
      if (isMounted) setLoading(false);
    }
    loadSellerData();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-muted)' }}>Loading profile...</div>;

  if (!seller || seller.role !== 'freelancer') {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <h2>Freelancer profile not found</h2>
        <p style={{ margin: 'var(--space-sm) 0' }}>This profile does not exist or has been suspended.</p>
        <Link to="/" style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>Return to Home</Link>
      </div>
    );
  }

  const trustProfile = marketplaceService.getTrustProfile(seller);

  return (
    <div style={{ padding: 'var(--space-xl) 0 var(--space-3xl)', background: 'var(--color-bg-dark)', minHeight: '100vh' }}>
      <div className="container">
        <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2xs)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          <ArrowLeft size={15} /> Back to marketplace
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }} className="profile-layout-grid">

          {/* Left: Profile Panel */}
          <div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-xl)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-md)',
              position: 'sticky', top: '84px',
            }}>
              <Avatar src={seller.avatar} name={seller.name} size={96} />
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, color: '#fff' }}>{seller.name}</h2>
                <p style={{ fontSize: 'var(--text-sm)', margin: '4px 0 8px', color: 'var(--color-text-light)' }}>{seller.title}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '999px', color: 'var(--color-accent)', fontSize: '11px', fontWeight: 700 }}>
                  <Award size={12} />
                  <span>{trustProfile.growthTier} Freelancer</span>
                </div>
              </div>

              <Rating value={seller.rating} count={seller.reviewsCount} size={15} singleStar={false} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: 'var(--space-md) 0', textAlign: 'left' }}>
                <div className="flex items-center gap-xs" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <MapPin size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span>{seller.location}</span>
                </div>
                <div className="flex items-center gap-xs" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <Globe size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span>{seller.languages?.join(', ') || 'English'}</span>
                </div>
                <div className="flex items-center gap-xs" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span><strong style={{ color: 'var(--color-text-main)' }}>{trustProfile.completedProjects}</strong> completed projects</span>
                </div>
                <div className="flex items-center gap-xs" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <Clock size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span>Responds within {trustProfile.responseTimeHours} hour</span>
                </div>
                <div className="flex items-center gap-xs" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <Calendar size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span>Member since {seller.createdDate}</span>
                </div>
              </div>

              {/* SKILLS VERIFICATION */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-light)', marginBottom: 'var(--space-xs)', fontWeight: 'var(--weight-semibold)' }}>
                  Verified Skills
                </div>
                <div className="flex" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  {seller.skills.map((s, idx) => (
                    <span key={idx} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', fontSize: '11px', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={11} color="var(--color-accent)" /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ width: '100%', marginTop: 'var(--space-xs)' }}>
                <span style={{ display: 'block', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', marginBottom: 'var(--space-sm)' }}>
                  Starting from <strong style={{ color: 'var(--color-accent)', fontSize: 'var(--text-base)' }}>${seller.startingPrice}/hr</strong>
                </span>
                <Button variant="primary" fullWidth onClick={() => alert(`Contact feature initialized for ${seller.name}`)}>
                  Start Conversation
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Bio + Trust Profile + Services */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

            {/* TRUST PROFILE DETAILED CARD */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '1rem', marginBottom: '16px' }}>
                <ShieldCheck size={20} />
                <span>VERIFIED TRUST PROFILE</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Identity</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.1rem', marginTop: '2px' }}>Verified ✓</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>On-Time Delivery</div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginTop: '2px' }}>{trustProfile.onTimeDeliveryRate}%</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Overall Rating</div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginTop: '2px' }}>{trustProfile.rating} / 5.0</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Recent 6-Month Rating</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.1rem', marginTop: '2px' }}>{trustProfile.recentRating} / 5.0</div>
                </div>
              </div>
            </div>

            {/* About section */}
            <TrustProfile userId={seller.id} />
            <ReviewList userId={seller.id} />

            {/* About section */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
            }}>
              <h3 style={{ marginBottom: 'var(--space-md)', color: '#fff' }}>About Me</h3>
              <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-muted)', margin: 0 }}>
                {seller.about || 'No bio provided by this freelancer.'}
              </p>
            </div>

            {/* Active Listings */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)', color: '#fff' }}>Services Offered</h3>
              {services.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
                  {services.map(srv => (
                    <div key={srv.id} className="service-card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                      <img src={srv.image} alt={srv.title} className="service-thumb" style={{ height: '140px' }} />
                      <div className="service-details" style={{ flexGrow: 1, padding: '14px' }}>
                        <Link to={`/service/${srv.id}`} className="service-title-link" style={{ fontSize: 'var(--text-sm)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                          {srv.title}
                        </Link>
                        <Rating value={srv.rating} count={srv.reviewsCount} size={12} />
                        <div className="service-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)' }}>{srv.deliveryTime}d delivery</span>
                          <div className="service-price" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>From ${srv.price}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)' }}>
                  This freelancer is not currently offering any public services.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .profile-layout-grid {
            grid-template-columns: 280px 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SellerProfile;
