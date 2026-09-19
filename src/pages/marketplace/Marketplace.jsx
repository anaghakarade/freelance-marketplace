import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import FilterSidebar from '../../components/marketplace/FilterSidebar';
import Button from '../../components/ui/Button';
import { Search, SlidersHorizontal, Clock, Star, ChevronDown, Flame, Filter, X, AlertCircle, RefreshCw } from 'lucide-react';

/* ── Service Card ─────────────────────────────────────────────────────────── */
const ServiceCard = ({ srv }) => (
  <Link to={`/service/${srv.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div className="service-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.5)', transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      {/* Cover */}
      <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', background: '#111', flexShrink: 0 }}>
        <img src={srv.coverImage || srv.image} alt={srv.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />

        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {srv.isFeatured && (
            <span style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Featured
            </span>
          )}
          {srv.isTrending && (
            <span style={{ background: 'rgba(245,158,11,0.9)', color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Flame size={10} /> Trending
            </span>
          )}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Seller Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={srv.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(srv.sellerName || 'A')}&background=10b981&color=fff`}
            alt={srv.sellerName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{srv.sellerName}</span>
        </div>
        {/* Title */}
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', lineHeight: 1.45, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {srv.title}
        </p>
        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Star size={12} fill='#f59e0b' stroke='#f59e0b' />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>{(srv.rating || 5).toFixed(1)}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>({srv.reviewCount || 0})</span>
        </div>
        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
            <Clock size={11} />
            <span>{srv.deliveryDays || srv.deliveryTime || '?'}d</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            From <strong style={{ color: 'var(--color-accent)', fontSize: 'var(--text-base)' }}>${srv.startingPrice || srv.price}</strong>
          </div>
        </div>
      </div>
    </div>
  </Link>
);

/* ── Skeleton Card ────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.4)', animation: 'pulse 1.5s ease infinite', height: '280px' }} />
);

/* ── API Error State ──────────────────────────────────────────────────────── */
const ApiErrorState = ({ message, onRetry }) => (
  <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', borderRadius: 'var(--radius-xl)', border: '1px dashed rgba(239,68,68,0.25)' }}>
    <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto var(--space-md)', display: 'block' }} />
    <h3 style={{ marginBottom: 'var(--space-xs)', color: '#fff' }}>Unable to load services</h3>
    <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)', maxWidth: 480, margin: '0 auto var(--space-md)' }}>
      {message || 'Please check that the WorkStream backend is running at http://localhost:8082'}
    </p>
    <button
      onClick={onRetry}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
    >
      <RefreshCw size={14} /> Retry
    </button>
  </div>
);

/* ── Main Marketplace Component ───────────────────────────────────────────── */
const Marketplace = () => {
  const navigate = useNavigate();
  const routeParams = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [trendingGroups] = useState(marketplaceService.getTrendingGroups()); // local data, sync
  const [tags] = useState(marketplaceService.getTags()); // local data, sync
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // 1. Derive canonical filters from URL Route Params + URL Query Params
  const canonicalFilters = useMemo(() => {
    const category = routeParams.categorySlug || searchParams.get('category') || '';
    const subcategory = routeParams.subcategorySlug || searchParams.get('subcategory') || '';
    const search = searchParams.get('search') || '';
    const trendingGroup = searchParams.get('trending') || searchParams.get('trendingGroup') || searchParams.get('trending_group') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || searchParams.get('max_price') || '';
    const minRating = searchParams.get('minRating') || searchParams.get('min_rating') || '';
    const maxDeliveryDays = searchParams.get('delivery') || searchParams.get('maxDeliveryDays') || '';
    const tag = searchParams.get('tag') || '';
    const sort = searchParams.get('sort') || searchParams.get('sortBy') || 'recommended';
    const page = parseInt(searchParams.get('page')) || 1;

    return {
      category,
      subcategory,
      search,
      trendingGroup,
      trending: trendingGroup,
      minPrice,
      maxPrice,
      minRating,
      maxDeliveryDays,
      tag,
      sort,
      sortBy: sort,
      page,
      limit: 24,
      paginate: true,
    };
  }, [routeParams, searchParams]);

  const [localSearch, setLocalSearch] = useState(canonicalFilters.search);

  useEffect(() => {
    setLocalSearch(canonicalFilters.search);
  }, [canonicalFilters.search]);

  // 2. Fetch categories once (async from API)
  useEffect(() => {
    marketplaceService.getCategories()
      .then(cats => setCategories(cats || []))
      .catch(() => setCategories([]));
  }, []);

  // 3. Dynamic subcategories based on active category (async from API)
  useEffect(() => {
    if (canonicalFilters.category) {
      marketplaceService.getSubcategories(canonicalFilters.category)
        .then(subs => setSubcategories(subs || []))
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [canonicalFilters.category]);

  // 4. Fetch services (async from API)
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await marketplaceService.filterServices(canonicalFilters);
      const list = Array.isArray(result) ? result : [];
      setServices(list);
      setTotal(result.total || list.length);
    } catch (err) {
      console.error('[Marketplace] Failed to fetch services:', err);
      setError(err.message || 'Failed to load services. Is the backend running?');
      setServices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canonicalFilters]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Helper to update filters state in URL
  const updateFilters = (newFilters) => {
    const params = new URLSearchParams();

    if (newFilters.category && !routeParams.categorySlug) params.set('category', newFilters.category);
    if (newFilters.subcategory && !routeParams.subcategorySlug) params.set('subcategory', newFilters.subcategory);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.trendingGroup) params.set('trending', newFilters.trendingGroup);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.minRating) params.set('minRating', newFilters.minRating);
    if (newFilters.maxDeliveryDays) params.set('delivery', newFilters.maxDeliveryDays);
    if (newFilters.tag) params.set('tag', newFilters.tag);
    if (newFilters.sort && newFilters.sort !== 'recommended') params.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page);

    // Navigate if category/subcategory route changed
    if (routeParams.categorySlug || routeParams.subcategorySlug) {
      const targetCat = newFilters.category || '';
      const targetSub = newFilters.subcategory || '';
      let targetPath = '/marketplace';
      if (targetCat && targetSub) targetPath = `/categories/${targetCat}/${targetSub}`;
      else if (targetCat) targetPath = `/categories/${targetCat}`;
      navigate(`${targetPath}${params.toString() ? `?${params.toString()}` : ''}`);
    } else {
      setSearchParams(params);
    }
  };

  const handleResetFilters = () => {
    if (routeParams.categorySlug || routeParams.subcategorySlug) {
      navigate('/marketplace');
    } else {
      setSearchParams({});
    }
    setLocalSearch('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ ...canonicalFilters, search: localSearch.trim(), page: 1 });
  };

  const handleLoadMore = async () => {
    const nextPage = (canonicalFilters.page || 1) + 1;
    try {
      const result = await marketplaceService.filterServices({ ...canonicalFilters, page: nextPage });
      const more = Array.isArray(result) ? result : [];
      setServices(prev => [...prev, ...more]);
      updateFilters({ ...canonicalFilters, page: nextPage });
    } catch (err) {
      console.error('[Marketplace] Load more failed:', err);
    }
  };

  // Derive active taxonomy labels for Breadcrumbs & Title
  const activeCategoryObj = useMemo(() => {
    if (!canonicalFilters.category) return null;
    return categories.find(c => c.slug === canonicalFilters.category || c.id === canonicalFilters.category) || null;
  }, [canonicalFilters.category, categories]);

  const activeSubcategoryObj = useMemo(() => {
    if (!canonicalFilters.subcategory) return null;
    return subcategories.find(s => s.slug === canonicalFilters.subcategory || s.id === canonicalFilters.subcategory) || null;
  }, [canonicalFilters.subcategory, subcategories]);

  const activeTrendingObj = useMemo(() => {
    return marketplaceService.getTrendingGroupBySlug(canonicalFilters.trendingGroup);
  }, [canonicalFilters.trendingGroup]);

  // Construct breadcrumbs
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Categories', link: '/categories' }];
    if (activeCategoryObj) {
      items.push({ label: activeCategoryObj.name, link: `/categories/${activeCategoryObj.slug}` });
    }
    if (activeSubcategoryObj) {
      items.push({ label: activeSubcategoryObj.name });
    } else if (activeTrendingObj) {
      items.push({ label: `Trending: ${activeTrendingObj.title}` });
    }
    return items;
  }, [activeCategoryObj, activeSubcategoryObj, activeTrendingObj]);

  const pageTitle = activeSubcategoryObj
    ? activeSubcategoryObj.name
    : activeCategoryObj
    ? activeCategoryObj.name
    : activeTrendingObj
    ? activeTrendingObj.title
    : canonicalFilters.search
    ? `Search: "${canonicalFilters.search}"`
    : 'Explore Services';

  const pageDescription =
    activeSubcategoryObj?.description ||
    activeCategoryObj?.description ||
    activeTrendingObj?.description ||
    'Discover top vetted freelancers and high-performing services tailored for your business needs.';

  return (
    <div style={{ padding: 'var(--space-xl) 0 var(--space-3xl)' }}>
      <div className="container">

        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Page Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ marginBottom: 'var(--space-xs)', fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            {pageTitle}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)', maxWidth: '680px', lineHeight: 1.5, marginBottom: 6 }}>
            {pageDescription}
          </p>
          <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>
            {loading ? 'Loading services from API…' : error ? 'Unable to reach backend' : `${total} service${total !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* Search & Top Action Bar */}
        <div style={{
          background: 'var(--glass-bg-primary)',
          backdropFilter: 'blur(var(--glass-blur-primary))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-primary))',
          border: '1px solid var(--glass-border-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Inline Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-xs)', flexGrow: 1, minWidth: '240px', maxWidth: '520px' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search services, skills, or keywords..."
                className="form-control"
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <Button type="submit" variant="primary" size="md" style={{ height: '40px', flexShrink: 0 }}>
              Search
            </Button>
          </form>

          {/* Mobile Filter Toggle & Sort selector */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="btn btn-outline btn-md mobile-filter-btn"
              style={{ height: '40px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Filter size={14} /> Filter Options
            </button>

            <select
              value={canonicalFilters.sort}
              onChange={(e) => updateFilters({ ...canonicalFilters, sort: e.target.value, page: 1 })}
              className="form-control"
              style={{ height: '40px', minWidth: '180px' }}
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="best_rated">Sort: Best Rated</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="most_reviewed">Most Reviewed</option>
              <option value="newest">Newest First</option>
              <option value="trending">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills */}
        {(canonicalFilters.category || canonicalFilters.subcategory || canonicalFilters.search || canonicalFilters.trendingGroup || canonicalFilters.minPrice || canonicalFilters.maxPrice || canonicalFilters.minRating || canonicalFilters.maxDeliveryDays || canonicalFilters.tag) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Active Filters:</span>

            {activeCategoryObj && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 99, fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                Category: {activeCategoryObj.name}
                <button onClick={() => updateFilters({ ...canonicalFilters, category: '', subcategory: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {activeSubcategoryObj && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 99, fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                Subcategory: {activeSubcategoryObj.name}
                <button onClick={() => updateFilters({ ...canonicalFilters, subcategory: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {activeTrendingObj && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#f59e0b' }}>
                Trending: {activeTrendingObj.title}
                <button onClick={() => updateFilters({ ...canonicalFilters, trendingGroup: '', trending: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {canonicalFilters.search && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#fff' }}>
                Search: "{canonicalFilters.search}"
                <button onClick={() => updateFilters({ ...canonicalFilters, search: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {(canonicalFilters.minPrice || canonicalFilters.maxPrice) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#fff' }}>
                Budget: ${canonicalFilters.minPrice || 0} – ${canonicalFilters.maxPrice || '∞'}
                <button onClick={() => updateFilters({ ...canonicalFilters, minPrice: '', maxPrice: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {canonicalFilters.maxDeliveryDays && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#fff' }}>
                Delivery: Up to {canonicalFilters.maxDeliveryDays} days
                <button onClick={() => updateFilters({ ...canonicalFilters, maxDeliveryDays: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {canonicalFilters.minRating && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#fff' }}>
                Rating: {canonicalFilters.minRating}+ ★
                <button onClick={() => updateFilters({ ...canonicalFilters, minRating: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            {canonicalFilters.tag && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 'var(--text-xs)', color: '#fff' }}>
                Tag: #{canonicalFilters.tag}
                <button onClick={() => updateFilters({ ...canonicalFilters, tag: '', page: 1 })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            )}

            <button onClick={handleResetFilters} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear All
            </button>
          </div>
        )}

        {/* Main Marketplace Layout: Sidebar + Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-xl)' }} className="marketplace-layout-grid">

          {/* Desktop Filter Sidebar */}
          <div className="desktop-filter-sidebar">
            <FilterSidebar
              categories={categories}
              subcategories={subcategories}
              tags={tags}
              trendingGroups={trendingGroups}
              filters={canonicalFilters}
              onFilterChange={updateFilters}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Main Services Grid Content */}
          <div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <ApiErrorState message={error} onRetry={fetchServices} />
            ) : services.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                  {services.map(srv => <ServiceCard key={srv.id} srv={srv} />)}
                </div>

                {/* Load More Pagination */}
                {services.length >= 24 && (
                  <div style={{ textAlign: 'center', marginTop: 48 }}>
                    <button
                      onClick={handleLoadMore}
                      style={{ padding: '12px 32px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                    >
                      <ChevronDown size={16} /> Load More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', borderRadius: 'var(--radius-xl)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <SlidersHorizontal size={36} style={{ color: 'var(--color-text-light)', margin: '0 auto var(--space-md)', display: 'block' }} />
                <h3 style={{ marginBottom: 'var(--space-xs)' }}>No services found</h3>
                <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)' }}>Try adjusting your filters or search terms.</p>
                <Button variant="outline" onClick={handleResetFilters}>Reset All Filters</Button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .marketplace-layout-grid { grid-template-columns: 1fr !important; }
          .desktop-filter-sidebar { display: none !important; }
          .mobile-filter-btn { display: inline-flex !important; }
        }
        @media (min-width: 901px) {
          .mobile-filter-btn { display: none !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', height: '100%', background: '#0b0f19', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <FilterSidebar
              categories={categories}
              subcategories={subcategories}
              tags={tags}
              trendingGroups={trendingGroups}
              filters={canonicalFilters}
              onFilterChange={(f) => { updateFilters(f); setMobileFilterOpen(false); }}
              onResetFilters={() => { handleResetFilters(); setMobileFilterOpen(false); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
