import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { LayoutDashboard, FileText, Mail, ShoppingCart, CheckCircle, Clock, ChevronDown, ChevronUp, Sparkles, HeartHandshake, ShieldCheck, PlusCircle } from 'lucide-react';

const ORDER_STEPS = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'requirements_submitted', label: 'Brief Submitted' },
  { status: 'active', label: 'In Progress' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_ORDER = ['pending', 'requirements_submitted', 'active', 'delivered', 'completed'];

const OrderStatusTimeline = ({ order }) => {
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  return (
    <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const cancelled = order.status === 'cancelled';
        return (
          <div key={step.status} style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 13, width: '50%', height: 2, background: done || active ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }} />
            )}
            {i < ORDER_STEPS.length - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 13, width: '50%', height: 2, background: done ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }} />
            )}
            <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cancelled ? 'rgba(239,68,68,0.15)' : done ? 'var(--color-accent)' : active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${cancelled ? 'rgba(239,68,68,0.4)' : done ? 'var(--color-accent)' : active ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`, zIndex: 1, flexShrink: 0, marginBottom: 6 }}>
              {done ? <CheckCircle size={12} color='#fff' fill='var(--color-accent)' /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: active && !cancelled ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)' }} />}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: active && !cancelled ? 'var(--color-accent)' : done ? 'var(--color-text-main)' : 'var(--color-text-light)', whiteSpace: 'nowrap' }}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HARSH_TERMS = ['terrible', 'horrible', 'useless', 'garbage', 'fix this right now', 'stupid', 'worst', 'unacceptable'];

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const urlOrderId = searchParams.get('orderId');
  const urlStep = searchParams.get('step');

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [orders, setOrders] = useState([]);
  const [selectedOrderForRequirements, setSelectedOrderForRequirements] = useState(null);
  const [requirementsData, setRequirementsData] = useState({});
  const [selectedOrderChat, setSelectedOrderChat] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [speechSuggestion, setSpeechSuggestion] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Dana / Give Back State
  const [giveBackModalOrder, setGiveBackModalOrder] = useState(null);
  const [giveBackPercent, setGiveBackPercent] = useState('1');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'buyer') { navigate('/login'); return; }
    const ordList = orderService.getOrdersForUser(currentUser.id, 'buyer');
    setOrders(ordList);
    if (urlOrderId) {
      const order = orderService.getOrderById(urlOrderId);
      if (order && urlStep === 'requirements') {
        setSelectedOrderForRequirements(order);
        handleTabChange('requirements');
      }
    }
  }, [currentUser, activeTab, urlOrderId, urlStep]);

  const handleTabChange = (t) => setSearchParams({ tab: t });

  const handleRequirementsSubmit = (e) => {
    e.preventDefault();
    try {
      const schema = selectedOrderForRequirements.requirementsSchema || [];
      const missing = schema.filter(q => q.required && !requirementsData[q.id]?.trim());
      if (missing.length > 0) { alert(`Please answer: ${missing[0].question}`); return; }
      orderService.submitRequirements(selectedOrderForRequirements.id, requirementsData);
      setSelectedOrderForRequirements(null);
      setRequirementsData({});
      handleTabChange('orders');
    } catch (err) { alert(err.message); }
  };

  const updateReqField = (qId, val) => setRequirementsData(prev => ({ ...prev, [qId]: val }));

  const handleCompleteOrderPrompt = (order) => {
    setGiveBackModalOrder(order);
  };

  const confirmCompleteWithGiveBack = () => {
    if (giveBackModalOrder) {
      orderService.completeOrder(giveBackModalOrder.id);
      setOrders(orderService.getOrdersForUser(currentUser.id, 'buyer'));
      setGiveBackModalOrder(null);
    }
  };

  const handleChatMessageChange = (val) => {
    setChatMessage(val);
    const lower = val.toLowerCase();
    const hasHarsh = HARSH_TERMS.some(term => lower.includes(term));
    if (hasHarsh) {
      setSpeechSuggestion('Constructive Suggestion: "The current version doesn\'t match our discussed requirements. Could we adjust the design and typography?"');
    } else {
      setSpeechSuggestion(null);
    }
  };

  const applySpeechSuggestion = () => {
    if (speechSuggestion) {
      setChatMessage("The current version doesn't match our discussed requirements. Could we adjust the design and typography?");
      setSpeechSuggestion(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    orderService.sendMessage(selectedOrderChat.id, chatMessage);
    setChatMessage('');
    setSpeechSuggestion(null);
    setSelectedOrderChat(orderService.getOrderById(selectedOrderChat.id));
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'orders', icon: FileText, label: 'My Orders' },
    { id: 'messages', icon: Mail, label: 'Messages' },
  ];

  return (
    <div className="dashboard-container">

      {/* DANA / GIVE BACK MODAL */}
      {giveBackModalOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
              <HeartHandshake size={20} />
              <span>GIVE BACK — Optional Social Initiative</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              Approve Order & Support Social Impact
            </h3>

            <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '20px' }}>
              You are completing order <strong>{giveBackModalOrder.serviceTitle}</strong> (${giveBackModalOrder.price}). You may optionally allocate a portion toward verified social & education initiatives.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
                Optional Contribution Percentage
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['0', '1', '5', '10'].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setGiveBackPercent(pct)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: giveBackPercent === pct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: giveBackPercent === pct ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.1)',
                      color: giveBackPercent === pct ? 'var(--color-accent)' : '#fff',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {pct}% {pct === '0' ? '(None)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="primary" fullWidth onClick={confirmCompleteWithGiveBack}>
                Approve Delivery & Release Funds
              </Button>
              <Button variant="outline" onClick={() => setGiveBackModalOrder(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-medium)' }}>
              {currentUser.accountType === 'corporate' ? 'Corporate Buyer' : 'Buyer'}
            </div>
          </div>
        </div>

        {navItems.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`sidebar-link ${activeTab === id ? 'sidebar-link-active' : ''}`} onClick={() => handleTabChange(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}

        <button className="sidebar-link" onClick={() => navigate('/post-project')} style={{ color: 'var(--color-accent)' }}>
          <PlusCircle size={16} /> Post Outcome Goal
        </button>

        <button className="sidebar-link" onClick={() => navigate('/marketplace')}>
          <ShoppingCart size={16} /> Browse Marketplace
        </button>
      </aside>

      <main className="dashboard-content">

        {/* ======== OVERVIEW ======== */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Buyer Dashboard</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Welcome back, {currentUser.name.split(' ')[0]}
            </p>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '32px' }}>
              {[
                { label: 'Active Orders', value: orders.filter(o => ['active', 'requirements_submitted', 'delivered'].includes(o.status)).length },
                { label: 'Completed', value: orders.filter(o => o.status === 'completed').length },
                { label: 'Total Gigs', value: orders.length },
              ].map(({ label, value }) => (
                <div key={label} className="stat-card">
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Orders</h3>
            {orders.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Service</th><th>Freelancer</th><th>Cost</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.serviceTitle}</strong></td>
                        <td>{o.sellerName}</td>
                        <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>${o.price}</td>
                        <td><Badge variant={o.status === 'completed' ? 'success' : o.status === 'active' ? 'info' : o.status === 'delivered' ? 'success' : 'warning'}>{o.status.toUpperCase()}</Badge></td>
                        <td>{o.dueDate || 'Awaiting Brief'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)' }}>
                <p style={{ marginBottom: 'var(--space-md)' }}>You haven't placed any orders yet.</p>
                <Button variant="primary" onClick={() => navigate('/marketplace')}>Browse Services</Button>
              </div>
            )}
          </div>
        )}

        {/* ======== MY ORDERS ======== */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>My Purchase Orders</h2>
            {orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.map(o => {
                  const isExpanded = expandedOrderId === o.id;
                  const statusColor = {
                    pending: 'var(--color-warning)',
                    requirements_submitted: '#3b82f6',
                    active: 'var(--color-accent)',
                    delivered: '#a78bfa',
                    completed: 'var(--color-accent)',
                    cancelled: 'var(--color-error)',
                  }[o.status] || 'var(--color-text-muted)';
                  const statusLabel = {
                    pending: 'Awaiting Brief',
                    requirements_submitted: 'Under Review',
                    active: 'In Progress',
                    delivered: 'Delivered',
                    completed: 'Completed',
                    cancelled: 'Cancelled',
                  }[o.status] || o.status;

                  return (
                    <div key={o.id} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.5)', transition: 'border-color 0.2s' }}>
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: `0 0 8px ${statusColor}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {o.serviceTitle}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {o.sellerName} · {o.packageTitle || 'Standard Package'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)', fontSize: 'var(--text-base)', flexShrink: 0 }}>${o.price}</div>
                        <div style={{ padding: '3px 10px', borderRadius: 99, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: statusColor, flexShrink: 0 }}>
                          {statusLabel}
                        </div>
                        {isExpanded ? <ChevronUp size={16} color='var(--color-text-light)' style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color='var(--color-text-light)' style={{ flexShrink: 0 }} />}
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          
                          {/* PROJECT HEALTH WIDGET */}
                          <div style={{ marginTop: 16, marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--text-xs)' }}>
                            <div><strong>Project Health:</strong></div>
                            <div style={{ color: 'var(--color-accent)' }}>Scope: Clear ✓</div>
                            <div style={{ color: 'var(--color-accent)' }}>Budget: Defined ✓</div>
                            <div style={{ color: o.deliveryTimeDays < 3 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                              Deadline: {o.deliveryTimeDays < 3 ? 'Potentially Aggressive ⚠' : 'Realistic ✓'}
                            </div>
                            <div style={{ color: 'var(--color-accent)' }}>Requirements: Complete ✓</div>
                          </div>

                          <div style={{ paddingTop: 8, marginBottom: 20 }}>
                            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 14 }}>Order Status</div>
                            <OrderStatusTimeline order={o} />
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {o.status === 'pending' && (
                              <Button variant="primary" size="sm" onClick={() => { setSelectedOrderForRequirements(o); handleTabChange('requirements'); }}>
                                Submit Brief
                              </Button>
                            )}
                            {o.status === 'delivered' && (
                              <Button variant="primary" size="sm" onClick={() => handleCompleteOrderPrompt(o)}>
                                Approve & Complete Order
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => { setSelectedOrderChat(orderService.getOrderById(o.id)); handleTabChange('messages'); }}>
                              Message Seller
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)' }}>
                No orders placed yet.
              </div>
            )}
          </div>
        )}

        {/* ======== REQUIREMENTS ======== */}
        {activeTab === 'requirements' && selectedOrderForRequirements && (
          <div style={{ maxWidth: '680px' }}>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Submit Project Brief</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
              Answer these questions so the freelancer can start your order.
            </p>

            <div style={{ background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', border: '1px solid var(--glass-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)' }}>
              <form onSubmit={handleRequirementsSubmit}>
                {(selectedOrderForRequirements.requirementsSchema || []).map((q, idx) => (
                  <div key={q.id} className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                    <label className="form-label">{idx + 1}. {q.question}</label>
                    <textarea className="form-control" rows={4} placeholder="Your detailed answer..." value={requirementsData[q.id] || ''} onChange={e => updateReqField(q.id, e.target.value)} required={q.required} style={{ resize: 'vertical' }} />
                  </div>
                ))}
                <div className="flex gap-sm" style={{ marginTop: 'var(--space-md)' }}>
                  <Button type="submit" variant="primary" fullWidth style={{ height: '44px' }}>Submit Requirements</Button>
                  <Button variant="outline" onClick={() => handleTabChange('orders')} style={{ height: '44px' }}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======== MESSAGES ======== */}
        {activeTab === 'messages' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Freelancer Conversations</h2>
            <div className="messages-layout">
              <div className="conversations-sidebar">
                {orders.map(o => (
                  <div key={o.id} className={`conversation-item ${selectedOrderChat?.id === o.id ? 'conversation-item-active' : ''}`} onClick={() => setSelectedOrderChat(orderService.getOrderById(o.id))}>
                    <Avatar src={o.sellerAvatar} name={o.sellerName} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.sellerName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.serviceTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-area">
                {selectedOrderChat ? (
                  <>
                    <div className="chat-header flex items-center gap-sm">
                      <Avatar src={selectedOrderChat.sellerAvatar} name={selectedOrderChat.sellerName} size={32} />
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{selectedOrderChat.sellerName}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)' }}>Order {selectedOrderChat.id}</div>
                      </div>
                    </div>
                    <div className="chat-history">
                      {selectedOrderChat.messages?.map((m, idx) => {
                        const isMe = m.senderId === currentUser.id;
                        return (
                          <div key={idx} className={`chat-bubble ${isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                            {m.text}
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT SPEECH ASSISTANT */}
                    {speechSuggestion && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>{speechSuggestion}</div>
                        <button type="button" onClick={applySpeechSuggestion} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: '10px' }}>
                          Use Suggestion
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="chat-input-wrapper flex gap-sm">
                      <input type="text" placeholder="Write your message..." className="form-control" value={chatMessage} onChange={(e) => handleChatMessageChange(e.target.value)} style={{ flexGrow: 1 }} />
                      <Button type="submit" variant="primary" style={{ flexShrink: 0 }}>Send</Button>
                    </form>
                  </>
                ) : (
                  <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)' }}>
                    Select a conversation to begin
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
