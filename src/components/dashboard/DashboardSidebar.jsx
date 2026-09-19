import React, { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';
import { Menu, X, ChevronRight } from 'lucide-react';
import { authService } from '../../services/authService';

/**
 * DashboardSidebar — Clean, attractive, and responsive sidebar for Seller, Buyer, and Admin dashboards.
 * Elegant minimalist design with crisp contrast, dynamic counters, and mobile drawer.
 */
export default function DashboardSidebar({
  user,
  role = 'freelancer', // 'freelancer' | 'buyer' | 'admin'
  roleBadge,
  sections = [],
  activeTab,
  onTabChange,
  footerWidget,
  extraBottomActions = [],
  activeTitle
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [internalUser, setInternalUser] = useState(() => authService.getCurrentUser());

  // Listen to live auth changes (e.g. session restore)
  useEffect(() => {
    const handleAuth = () => {
      setInternalUser(authService.getCurrentUser());
    };
    window.addEventListener('authChange', handleAuth);
    return () => window.removeEventListener('authChange', handleAuth);
  }, []);

  // Close drawer on window resize or Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Compute effective user & guaranteed display name
  const effectiveUser = user || internalUser || authService.getCurrentUser();
  const rawName = effectiveUser?.name || effectiveUser?.username || effectiveUser?.fullName || effectiveUser?.displayName;
  const displayName = rawName && rawName.trim()
    ? rawName.trim()
    : (effectiveUser?.email ? effectiveUser.email.split('@')[0] : (role === 'admin' ? 'Administrator' : role === 'buyer' ? 'Client' : 'Freelancer'));

  // Determine role label & indicator style
  const resolvedRoleBadge = roleBadge || (
    role === 'admin' ? 'Administrator' :
    role === 'buyer' ? (effectiveUser?.accountType === 'corporate' ? 'Corporate Buyer' : 'Verified Buyer') :
    'Verified Freelancer'
  );

  const roleDotColor = 
    role === 'admin' ? '#f43f5e' :
    role === 'buyer' ? '#38bdf8' :
    '#10b981';

  // Find active label for mobile bar
  let currentTabLabel = activeTitle;
  if (!currentTabLabel) {
    for (const sec of sections) {
      const match = sec.items?.find(i => i.id === activeTab);
      if (match) {
        currentTabLabel = match.label;
        break;
      }
    }
  }

  const renderSidebarContent = (isMobile = false) => (
    <div className="dashboard-sidebar-inner">
      {/* Mobile Drawer Header */}
      {isMobile && (
        <div className="sidebar-mobile-drawer-header">
          <span>Navigation</span>
          <button 
            onClick={() => setMobileDrawerOpen(false)}
            className="sidebar-close-btn"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* User Profile Header — Simple, High-Contrast & Beautiful */}
      <div className="sidebar-user">
        <div className="sidebar-avatar-wrapper">
          <Avatar 
            src={effectiveUser?.avatar} 
            name={displayName} 
            size={38} 
          />
          <span className="sidebar-status-dot" title="Online" />
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name" title={displayName}>
            {displayName}
          </div>
          <div className="sidebar-user-role">
            <span className="sidebar-role-indicator" style={{ background: roleDotColor }} />
            <span>{resolvedRoleBadge}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-sections-container">
        {sections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="sidebar-section-group">
            {section.title && (
              <div className="sidebar-section-title">
                {section.title}
              </div>
            )}
            <nav className="sidebar-nav">
              {section.items?.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (item.isAction) {
                  return (
                    <button
                      key={item.id}
                      className="sidebar-action-btn"
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        else if (onTabChange) onTabChange(item.id);
                        if (isMobile) setMobileDrawerOpen(false);
                      }}
                    >
                      {Icon && <Icon size={16} />}
                      <span>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      else if (onTabChange) onTabChange(item.id);
                      if (isMobile) setMobileDrawerOpen(false);
                    }}
                    title={item.label}
                  >
                    <div className="sidebar-item-left">
                      <span className="sidebar-item-icon">
                        {Icon && <Icon size={17} />}
                      </span>
                      <span className="sidebar-item-label">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && item.badge !== '' && (
                      <span className={`sidebar-badge ${item.badgeType === 'accent' ? 'sidebar-badge-accent' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Extra Bottom Action Shortcuts */}
      {extraBottomActions.length > 0 && (
        <div className="sidebar-extra-actions">
          {extraBottomActions.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label || idx}
                className="sidebar-extra-link"
                onClick={() => {
                  action.onClick?.();
                  if (isMobile) setMobileDrawerOpen(false);
                }}
                style={action.style}
              >
                {ActionIcon && <ActionIcon size={15} />}
                <span>{action.label}</span>
                <ChevronRight size={13} className="sidebar-extra-chevron" />
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Status Widget */}
      {footerWidget && (
        <div className="sidebar-footer-widget">
          {footerWidget}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Sub-Bar */}
      <div className="dashboard-mobile-bar">
        <div className="dashboard-mobile-title-wrap">
          <span className="dashboard-mobile-role">{resolvedRoleBadge}</span>
          <span className="dashboard-mobile-slash">/</span>
          <span className="dashboard-mobile-label">{currentTabLabel || 'Dashboard'}</span>
        </div>

        <button 
          className="dashboard-mobile-toggle-btn"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={16} />
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Sliding Drawer & Backdrop */}
      {mobileDrawerOpen && (
        <>
          <div 
            className="dashboard-drawer-backdrop" 
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="dashboard-drawer-panel">
            {renderSidebarContent(true)}
          </div>
        </>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="dashboard-sidebar">
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
