import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, Clock } from 'lucide-react';
import Avatar from './Avatar';
import ImageWithFallback from './ImageWithFallback';
import { marketplaceService } from '../../services/marketplaceService';

const ServiceCard = ({ service, onFavoriteToggle }) => {
  const [isFav, setIsFav] = useState(service.isFavorite || false);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextFavState = marketplaceService.toggleFavorite(service.id);
    setIsFav(nextFavState);
    if (onFavoriteToggle) onFavoriteToggle(service.id, nextFavState);
  };

  const formattedPrice = `₹${((service.startingPrice || service.price || 50) * 85).toLocaleString()}`;

  return (
    <div
      className="service-card"
      style={{
        textDecoration: 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-glass, rgba(15, 23, 42, 0.55))',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        borderRadius: 'var(--radius-xl, 16px)',
        boxShadow: 'var(--card-shadow, 0 4px 16px rgba(0,0,0,0.1))',
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      
      {/* Cover Image & Favorite Toggle */}
      <div style={{ position: 'relative', width: '100%', height: '160px', overflow: 'hidden' }}>
        <ImageWithFallback
          src={service.coverImage || service.image}
          alt={service.title}
          fallbackText={service.categoryName || 'Service'}
          className="service-thumb"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <button
          onClick={handleFavoriteClick}
          aria-label="Save to favorites"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'var(--surface-glass, rgba(11, 15, 25, 0.65))',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isFav ? '#ef4444' : 'var(--icon-primary, #ffffff)',
            transition: 'transform 0.15s, background 0.15s',
            zIndex: 3,
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Heart size={15} fill={isFav ? '#ef4444' : 'none'} />
        </button>

        {service.isTrending && (
          <span style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'var(--color-accent, #10b981)',
            color: '#030712',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '999px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Trending
          </span>
        )}
      </div>

      {/* Body Details */}
      <div className="service-details" style={{ padding: 'var(--space-md)', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Seller Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar src={service.sellerAvatar} name={service.sellerName} size={24} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-main)', fontWeight: 600 }}>
              {service.sellerName}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              {service.sellerTitle || 'Freelancer'}
            </span>
          </div>
        </div>

        {/* Service Title */}
        <Link to={`/service/${service.slug || service.id}`} className="service-title-link" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textDecoration: 'none' }}>
          {service.title}
        </Link>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
          <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {(service.rating || 5.0).toFixed(1)}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            ({service.reviewCount || service.reviewsCount || 0})
          </span>
        </div>

        {/* Footer info: Delivery days & Price */}
        <div className="service-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))', paddingTop: 'var(--space-xs)', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={11} /> {service.deliveryDays || service.deliveryTime || 3}d delivery
          </span>
          <div className="service-price" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            From <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-main)' }}>{formattedPrice}</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default ServiceCard;
