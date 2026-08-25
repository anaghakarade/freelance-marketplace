import React from 'react';
import { Filter, RotateCcw, Check, Star, Flame } from 'lucide-react';

const FilterSidebar = ({
  categories = [],
  subcategories = [],
  tags = [],
  trendingGroups = [],
  filters = {},
  onFilterChange,
  onResetFilters,
}) => {
  const handleInputChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value, page: 1 });
  };

  const handleSubcategoryToggle = (subSlug) => {
    const currentSub = filters.subcategory;
    const nextSub = currentSub === subSlug ? '' : subSlug;
    onFilterChange({ ...filters, subcategory: nextSub, page: 1 });
  };

  const handleTagToggle = (tagSlug) => {
    const currentTag = filters.tag;
    const nextTag = currentTag === tagSlug ? '' : tagSlug;
    onFilterChange({ ...filters, tag: nextTag, page: 1 });
  };

  const handleTrendingToggle = (groupSlug) => {
    const currentTrending = filters.trendingGroup || filters.trending;
    const nextTrending = currentTrending === groupSlug ? '' : groupSlug;
    onFilterChange({ ...filters, trendingGroup: nextTrending, trending: nextTrending, page: 1 });
  };

  const activeFiltersCount = [
    filters.category,
    filters.subcategory,
    filters.trendingGroup,
    filters.trending,
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDeliveryDays,
    filters.minRating,
    filters.tag,
  ].filter(Boolean).length;

  return (
    <aside style={{
      background: 'rgba(11, 15, 25, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-lg)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
            Filters {activeFiltersCount > 0 && <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 800 }}>({activeFiltersCount})</span>}
          </h3>
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-light)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-family)',
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Category Dropdown/Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
          Category
        </h4>
        <select
          value={filters.category || ''}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className="form-control"
          style={{ height: '38px', fontSize: 'var(--text-xs)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: '#fff' }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Subcategories (if available for selected category) */}
      {subcategories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
            Subcategories
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {subcategories.map((sub) => {
              const isSelected = filters.subcategory === sub.slug;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubcategoryToggle(sub.slug)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span>{sub.name}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trending Groups Filter */}
      {trendingGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={12} /> Trending Collections
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {trendingGroups.map(group => {
              const isSelected = (filters.trendingGroup || filters.trending) === group.slug;
              return (
                <button
                  key={group.id}
                  onClick={() => handleTrendingToggle(group.slug)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  <span>{group.title}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
          Budget Range ($ USD)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>Min ($)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minPrice || ''}
              onChange={(e) => handleInputChange('minPrice', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 'var(--text-xs)',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>Max ($)</label>
            <input
              type="number"
              placeholder="1000"
              value={filters.maxPrice || ''}
              onChange={(e) => handleInputChange('maxPrice', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 'var(--text-xs)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Delivery Time Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
          Delivery Speed
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { label: 'Any', value: '' },
            { label: 'Up to 3 days', value: '3' },
            { label: 'Up to 7 days', value: '7' },
            { label: 'Up to 14 days', value: '14' },
          ].map((item) => {
            const isSelected = String(filters.maxDeliveryDays || '') === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleInputChange('maxDeliveryDays', item.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum Rating */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
          Minimum Rating
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { label: 'Any Rating', value: '' },
            { label: '4.5 & up', value: '4.5' },
            { label: '4.8 & up', value: '4.8' },
          ].map((item) => {
            const isSelected = String(filters.minRating || '') === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleInputChange('minRating', item.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  textAlign: 'left',
                }}
              >
                <Star size={12} fill={isSelected ? '#10b981' : 'none'} stroke={isSelected ? '#10b981' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Tag Pills */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', margin: 0, fontWeight: 700 }}>
            Skills & Tags
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
            {tags.slice(0, 16).map((t) => {
              const isSelected = filters.tag === t.slug || filters.tag === t.name;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTagToggle(t.slug)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-light)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </aside>
  );
};

export default FilterSidebar;
