import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, ShoppingBag, LayoutDashboard, Heart, LogOut, Sparkles, Flame, Grid, Globe, Settings, Bell } from 'lucide-react';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import Avatar from '../ui/Avatar';
import { usePreference } from './PreferenceContext';
import { useTranslation } from '../../i18n/i18n';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  
  const { theme, setTheme, motion, setMotion } = usePreference();
  const { locale, setLocale, t } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [prefDropdownOpen, setPrefDropdownOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesData, setCategoriesData] = useState([]);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);
  const prefRef = useRef(null);

  useEffect(() => {
    const sub = authService.onAuthStateChange(() => {
      setCurrentUser(authService.getCurrentUser());
    });
    return () => {
      if (sub?.unsubscribe) sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      notificationService.getUnreadCount(currentUser.id).then(setUnreadCount);
      const unsub = notificationService.subscribeToNotifications(currentUser.id, () => {
        notificationService.getUnreadCount(currentUser.id).then(setUnreadCount);
      });
      return unsub;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    // Load categories data once on mount for performant navbar mega menu
    const cats = marketplaceService.getCategories();
    const enriched = cats.slice(0, 8).map(c => ({
      ...c,
      subs: marketplaceService.getSubcategories(c.slug).slice(0, 3)
    }));
    setCategoriesData(enriched);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setCategoriesDropdownOpen(false);
    setLangDropdownOpen(false);
    setPrefDropdownOpen(false);
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
        setCategoriesDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
      if (prefRef.current && !prefRef.current.contains(e.target)) {
        setPrefDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = (e) => {
    const role = e.target.value;
    authService.switchRole(role);
    setUserDropdownOpen(false);
    if (role === 'admin') navigate('/admin');
    else if (role === 'buyer') navigate('/buyer');
    else navigate('/seller');
  };

  const handleLogout = () => {
    authService.logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleBecomeFreelancer = () => {
    if (!currentUser) {
      navigate('/register?role=freelancer');
    } else if (currentUser.role === 'freelancer') {
      navigate('/seller');
    } else {
      authService.switchRole('freelancer');
      navigate('/seller');
    }
  };

  const dashboardPath = currentUser?.role === 'freelancer'
    ? '/seller'
    : currentUser?.role === 'buyer'
    ? '/buyer'
    : '/admin';

  return (
    <header className="navbar-header" ref={dropdownRef}>
      <div className="container navbar-inner">

        {/* LEFT — Logo & Core Navigation */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" aria-label="WorkStream Home">
            Work<span className="logo-accent">Stream</span>
          </Link>

          <nav className="navbar-nav" aria-label="Main Navigation">
            <Link to="/marketplace" className={`nav-item ${location.pathname === '/marketplace' ? 'active' : ''}`}>
              {t('navbar.services')}
            </Link>

            <Link to="/post-project" className={`nav-item ${location.pathname === '/post-project' ? 'active' : ''}`} style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
              {t('navbar.postProject')}
            </Link>
            
            <Link to="/categories/trending" className={`nav-item ${location.pathname === '/categories/trending' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={13} style={{ color: 'var(--color-accent)' }} />
              <span>{t('navbar.trending')}</span>
            </Link>

            <Link to="/principles" className={`nav-item ${location.pathname === '/principles' ? 'active' : ''}`}>
              {t('navbar.principles')}
            </Link>

            {/* Categories Dynamic Dropdown / Mega Menu */}
            <div className="nav-dropdown-wrapper">
              <button
                className={`nav-item nav-dropdown-trigger ${location.pathname.startsWith('/categories') ? 'active' : ''}`}
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                aria-expanded={categoriesDropdownOpen}
              >
                <span>{t('navbar.categories')}</span>
                <ChevronDown size={13} className={`chevron ${categoriesDropdownOpen ? 'open' : ''}`} />
              </button>

              {categoriesDropdownOpen && (
                <div className="nav-dropdown-menu" style={{ minWidth: '280px', padding: '12px', background: 'var(--dropdown-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--dropdown-border)', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '380px', overflowY: 'auto' }}>
                    {categoriesData.map((cat) => (
                      <div key={cat.id} style={{ padding: '6px 8px', borderRadius: '8px', transition: 'background 0.15s' }}>
                        <Link
                          to={`/categories/${cat.slug}`}
                          className="nav-dropdown-link"
                          style={{ fontWeight: 700, color: 'var(--color-text-main)', fontSize: '13px', display: 'block', textDecoration: 'none', marginBottom: cat.subs.length ? '2px' : 0 }}
                          onClick={() => setCategoriesDropdownOpen(false)}
                        >
                          {cat.name}
                        </Link>
                        {cat.subs.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '4px' }}>
                            {cat.subs.map(sub => (
                              <Link
                                key={sub.id}
                                to={`/categories/${cat.slug}/${sub.slug}`}
                                style={{ fontSize: '11px', color: 'var(--color-text-light)', textDecoration: 'none', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }}
                                onClick={() => setCategoriesDropdownOpen(false)}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', textAlign: 'center' }}>
                    <Link
                      to="/categories"
                      style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setCategoriesDropdownOpen(false)}
                    >
                      <Grid size={12} /> {t('navbar.viewAllCategories')} →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* RIGHT — Search, Become a Freelancer, Auth Actions */}
        <div className="navbar-right">

          {/* Inline Search Form */}
          <form onSubmit={handleSearchSubmit} className="header-search-form">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('navbar.searchPlaceholder')}
              className="header-search-input"
            />
          </form>

          {/* Become a Freelancer Button */}
          <button
            onClick={handleBecomeFreelancer}
            className="become-freelancer-btn"
          >
            <Sparkles size={13} />
            <span>{t('navbar.becomeFreelancer')}</span>
          </button>

          {/* Language Selector */}
          <div className="nav-dropdown-wrapper" ref={langRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="nav-item nav-dropdown-trigger"
              aria-label="Select language"
              aria-expanded={langDropdownOpen}
              style={{ gap: '6px' }}
            >
              <Globe size={14} />
              <span>{locale === 'en' ? 'EN' : 'हिन्दी'}</span>
              <ChevronDown size={11} className={`chevron ${langDropdownOpen ? 'open' : ''}`} />
            </button>
            {langDropdownOpen && (
              <div className="nav-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '120px' }}>
                <button
                  onClick={() => { setLocale('en'); setLangDropdownOpen(false); }}
                  className="user-dropdown-item"
                  style={{ fontWeight: locale === 'en' ? 700 : 400 }}
                >
                  English
                </button>
                <button
                  onClick={() => { setLocale('hi'); setLangDropdownOpen(false); }}
                  className="user-dropdown-item"
                  style={{ fontWeight: locale === 'hi' ? 700 : 400 }}
                >
                  हिन्दी
                </button>
              </div>
            )}
          </div>

          {/* Preferences Button */}
          <div className="nav-dropdown-wrapper" ref={prefRef}>
            <button
              onClick={() => setPrefDropdownOpen(!prefDropdownOpen)}
              className="nav-item nav-dropdown-trigger"
              aria-label="Change preferences"
              aria-expanded={prefDropdownOpen}
              style={{ padding: '6px' }}
            >
              <Settings size={14} />
            </button>
            {prefDropdownOpen && (
              <div className="user-dropdown-menu" style={{ right: 0, left: 'auto', width: '220px', padding: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)' }}>
                  {t('preferences.title')}
                </h4>
                
                {/* Theme selector */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    {t('preferences.appearance')}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '2px' }}>
                    {['light', 'dark', 'system'].map((tVal) => (
                      <button
                        key={tVal}
                        onClick={() => setTheme(tVal)}
                        style={{
                          flex: 1,
                          fontSize: '11px',
                          border: 'none',
                          background: theme === tVal ? 'var(--color-accent)' : 'transparent',
                          color: theme === tVal ? '#0b0f19' : 'var(--color-text-muted)',
                          padding: '4px 0',
                          borderRadius: '4px',
                          fontWeight: theme === tVal ? 700 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        {t(`preferences.${tVal}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion selector */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    {t('preferences.motion')}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '2px' }}>
                    {['standard', 'reduced'].map((mVal) => (
                      <button
                        key={mVal}
                        onClick={() => setMotion(mVal)}
                        style={{
                          flex: 1,
                          fontSize: '11px',
                          border: 'none',
                          background: motion === mVal ? 'var(--color-accent)' : 'transparent',
                          color: motion === mVal ? '#0b0f19' : 'var(--color-text-muted)',
                          padding: '4px 0',
                          borderRadius: '4px',
                          fontWeight: motion === mVal ? 700 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        {t(`preferences.${mVal}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell Badge */}
          {currentUser && (
            <Link
              to="/messages"
              className="nav-item"
              style={{ position: 'relative', padding: '6px', display: 'inline-flex', alignItems: 'center' }}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '99px',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Authentication Area */}
          {currentUser ? (
            <div className="user-profile-menu-wrapper">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="user-profile-trigger"
                aria-expanded={userDropdownOpen}
              >
                <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
                <span className="user-name-label">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown size={13} className={`chevron ${userDropdownOpen ? 'open' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <p className="user-dropdown-name">{currentUser.name}</p>
                    <p className="user-dropdown-email">{currentUser.email}</p>

                    <div className="nav-role-switcher">
                      <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{t('navbar.roleLabel')}</span>
                      <select value={currentUser.role} onChange={handleRoleSwitch}>
                        <option value="freelancer">Freelancer</option>
                        <option value="buyer">Buyer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />

                  <Link to={dashboardPath} className="user-dropdown-item" onClick={() => setUserDropdownOpen(false)}>
                    <LayoutDashboard size={14} />
                    <span>{t('navbar.dashboard')}</span>
                  </Link>

                  {currentUser.role === 'buyer' && (
                    <Link to="/buyer/orders" className="user-dropdown-item" onClick={() => setUserDropdownOpen(false)}>
                      <ShoppingBag size={14} />
                      <span>{t('navbar.myOrders')}</span>
                    </Link>
                  )}

                  {currentUser.role === 'freelancer' && (
                    <Link to="/seller/services" className="user-dropdown-item" onClick={() => setUserDropdownOpen(false)}>
                      <Sparkles size={14} />
                      <span>{t('navbar.manageServices')}</span>
                    </Link>
                  )}

                  <Link to="/buyer" className="user-dropdown-item" onClick={() => setUserDropdownOpen(false)}>
                    <Heart size={14} />
                    <span>{t('navbar.savedServices')}</span>
                  </Link>

                  <div className="user-dropdown-divider" />

                  <button onClick={handleLogout} className="user-dropdown-item logout-item">
                    <LogOut size={14} />
                    <span>{t('navbar.logOut')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons-group">
              <Link to="/login" className="auth-login-link">
                {t('navbar.logIn')}
              </Link>
              <Link to="/register" className="auth-signup-btn">
                {t('navbar.signUp')}
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-toggle-btn"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <form onSubmit={handleSearchSubmit} className="mobile-search-form">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('navbar.searchPlaceholder')}
              className="mobile-search-input"
            />
          </form>

          <div className="mobile-drawer-links">
            <Link to="/marketplace" className="mobile-drawer-item">{t('navbar.services')}</Link>
            <Link to="/categories/trending" className="mobile-drawer-item">{t('navbar.trending')}</Link>
            <Link to="/categories" className="mobile-drawer-item">{t('categories.title')}</Link>
            
            <button onClick={handleBecomeFreelancer} className="mobile-drawer-item" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('navbar.becomeFreelancer')} →
            </button>
          </div>

          <div className="mobile-drawer-footer">
            {/* Preferences Selectors for Mobile */}
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>
                {t('preferences.title')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Language Select */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('preferences.language')}</span>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="en" style={{ color: '#000' }}>English</option>
                    <option value="hi" style={{ color: '#000' }}>हिन्दी</option>
                  </select>
                </div>
                {/* Theme Select */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('preferences.appearance')}</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="light" style={{ color: '#000' }}>{t('preferences.light')}</option>
                    <option value="dark" style={{ color: '#000' }}>{t('preferences.dark')}</option>
                    <option value="system" style={{ color: '#000' }}>{t('preferences.system')}</option>
                  </select>
                </div>
                {/* Motion Select */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('preferences.motion')}</span>
                  <select
                    value={motion}
                    onChange={(e) => setMotion(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="standard" style={{ color: '#000' }}>{t('preferences.standard')}</option>
                    <option value="reduced" style={{ color: '#000' }}>{t('preferences.reduced')}</option>
                  </select>
                </div>
              </div>
            </div>

            {currentUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar src={currentUser.avatar} name={currentUser.name} size={36} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>{currentUser.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>{currentUser.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to={dashboardPath} className="btn btn-outline btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    {t('navbar.dashboard')}
                  </Link>
                  <button onClick={handleLogout} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                    {t('navbar.logOut')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/login" className="btn btn-outline btn-md" style={{ flex: 1, textAlign: 'center' }}>
                  {t('navbar.logIn')}
                </Link>
                <Link to="/register" className="btn btn-primary btn-md" style={{ flex: 1, textAlign: 'center' }}>
                  {t('navbar.signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
