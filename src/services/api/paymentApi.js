import { apiClient } from './apiClient';
export const paymentApi = {
  fundMilestone: async (id) => { const r = await apiClient.post(`/milestones/${id}/fund`); return r?.data ?? r; },
  releasePayment: async (id) => { const r = await apiClient.post(`/payments/${id}/release`); return r?.data ?? r; },
  refundPayment: async (id) => { const r = await apiClient.post(`/payments/${id}/refund`); return r?.data ?? r; },
  getPayment: async (id) => { const r = await apiClient.get(`/payments/${id}`); return r?.data ?? r; },
  getContractPayments: async (id) => { const r = await apiClient.get(`/contracts/${id}/payments`); return r?.payments || r?.data?.payments || (Array.isArray(r) ? r : []); },
  getMilestonePayment: async (id) => { const r = await apiClient.get(`/milestones/${id}/payment`); return r?.data ?? r; },
  getMyPayments: async () => { const r = await apiClient.get('/me/payments'); return r?.payments || r?.data?.payments || (Array.isArray(r) ? r : []); },
  getMyWallet: async () => { const r = await apiClient.get('/me/wallet'); return r?.data ?? r; },
  getMyEarnings: async () => { const r = await apiClient.get('/me/earnings'); return r?.data ?? r; },
  getMyLedger: async () => { const r = await apiClient.get('/me/ledger'); return r?.ledger || r?.data?.ledger || (Array.isArray(r) ? r : []); },
};
