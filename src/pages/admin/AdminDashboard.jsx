import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { marketplaceService } from '../../services/marketplaceService';
import { orderService } from '../../services/orderService';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { LayoutDashboard, Users, FolderTree, ShieldAlert } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);

  const [newCategory, setNewCategory] = useState({ name: '', description: '', iconName: 'Sparkles' });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/login'); return; }
    setUsers(authService.getUsers());
    setServices(marketplaceService.getServices());
    setCategories(marketplaceService.getCategories());
    setOrders(orderService.getOrders());
  }, [currentUser, activeTab]);

  const handleTabChange = (t) => setSearchParams({ tab: t });

  const handleToggleUserStatus = (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    userService.updateUserStatus(userId, nextStatus);
    setUsers(authService.getUsers());
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategory.name) return;
    marketplaceService.addCategory(newCategory);
    setNewCategory({ name: '', description: '', iconName: 'Sparkles' });
    setCategories(marketplaceService.getCategories());
  };

  const handleDeleteCategory = (catId) => {
    if (confirm('Delete this category?')) {
      marketplaceService.deleteCategory(catId);
      setCategories(marketplaceService.getCategories());
    }
  };

  const handleToggleService = (srvId) => {
    if (confirm('Remove this service listing from the marketplace?')) {
      marketplaceService.deleteService(srvId);
      setServices(marketplaceService.getServices());
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'categories', icon: FolderTree, label: 'Categories' },
    { id: 'services', icon: ShieldAlert, label: 'Moderation' },
  ];

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#f87171', fontWeight: 'var(--weight-medium)' }}>Administrator</div>
          </div>
        </div>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`sidebar-link ${activeTab === id ? 'sidebar-link-active' : ''}`} onClick={() => handleTabChange(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </aside>

      <main className="dashboard-content">

        {/* ======== OVERVIEW ======== */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Admin Control Panel</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Platform health overview</p>
            <div className="stats-grid">
              {[
                { label: 'Registered Users', value: users.length },
                { label: 'Active Gigs', value: services.length },
                { label: 'Orders Completed', value: orders.filter(o => o.status === 'completed').length },
                { label: 'Platform Volume', value: `$${orders.reduce((a, c) => a + c.price, 0)}` },
              ].map(({ label, value }) => (
                <div key={label} className="stat-card">
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Signups</h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
                <tbody>
                  {users.slice(-5).reverse().map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                      <td><Badge variant="default">{u.role.toUpperCase()}</Badge></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.createdDate}</td>
                      <td><Badge variant={u.status === 'active' ? 'success' : 'error'}>{u.status.toUpperCase()}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======== USERS ======== */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>User Account Management</h2>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>User</th><th>Email</th><th>Structure</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-xs">
                          <Avatar src={u.avatar} name={u.name} size={28} />
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.accountType}</td>
                      <td><Badge variant="default">{u.role.toUpperCase()}</Badge></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.createdDate}</td>
                      <td><Badge variant={u.status === 'active' ? 'success' : 'error'}>{u.status.toUpperCase()}</Badge></td>
                      <td>
                        {u.role !== 'admin' && (
                          <Button variant={u.status === 'active' ? 'danger' : 'primary'} size="sm" onClick={() => handleToggleUserStatus(u.id, u.status)} style={{ fontSize: '11px' }}>
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======== CATEGORIES ======== */}
        {activeTab === 'categories' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }} className="categories-layout-grid">
            <div>
              <h2 style={{ marginBottom: 'var(--space-lg)' }}>Add Category</h2>
              <div style={{ background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', WebkitBackdropFilter: 'blur(var(--glass-blur-secondary))', border: '1px solid var(--glass-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)' }}>
                <form onSubmit={handleCreateCategory}>
                  <Input label="Category Name" placeholder="Mobile App Dev" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required />
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="3" placeholder="Describe what services fall under this category..." value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} required style={{ resize: 'vertical' }} />
                  </div>
                  <Select label="Lucide Icon" value={newCategory.iconName} onChange={(e) => setNewCategory({ ...newCategory, iconName: e.target.value })} options={['Sparkles', 'Code', 'Layout', 'PenTool', 'TrendingUp', 'Cpu', 'Image', 'Video', 'Briefcase', 'Music', 'Globe', 'BarChart2', 'BookOpen', 'Heart', 'Megaphone'].map(v => ({ value: v, label: v }))} />
                  <Button type="submit" variant="primary" fullWidth style={{ height: '44px', marginTop: 'var(--space-xs)' }}>Add Category</Button>
                </form>
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Taxonomy ({categories.length} Categories)</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Icon</th><th>Name</th><th>ID</th><th>Slug</th><th>Subcategories</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map(c => {
                      const subCount = marketplaceService.getSubcategories(c.id).length;
                      return (
                        <tr key={c.id}>
                          <td><code style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>{c.iconName}</code></td>
                          <td><strong>{c.name}</strong></td>
                          <td><code style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{c.id}</code></td>
                          <td><code style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>{c.slug}</code></td>
                          <td>
                            <Badge variant="default">{subCount} sub</Badge>
                          </td>
                          <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Link to={`/categories/${c.slug}`} style={{ fontSize: '11px', color: 'var(--color-accent)' }}>Browse</Link>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(c.id)} style={{ fontSize: '11px' }}>Delete</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======== SERVICES MODERATION ======== */}
        {activeTab === 'services' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Service Listings Moderation</h2>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Thumbnail</th><th>Service Title</th><th>Category</th><th>Price</th><th>Rating</th><th>Actions</th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td><img src={s.image} alt={s.title} style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} /></td>
                      <td>
                        <Link to={`/service/${s.id}`} style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{s.title}</Link>
                      </td>
                      <td><Badge variant="default">{s.category}</Badge></td>
                      <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>${s.price}</td>
                      <td style={{ color: '#fbbf24' }}>★ {s.rating?.toFixed(1)}</td>
                      <td><Button variant="danger" size="sm" onClick={() => handleToggleService(s.id)} style={{ fontSize: '11px' }}>Remove</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      <style>{`
        @media (min-width: 1024px) {
          .categories-layout-grid {
            grid-template-columns: 1fr 2fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
