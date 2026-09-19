import { apiClient } from './apiClient';
export const paymentApi = {
  fundMilestone: async (id) => (await apiClient.post(`/milestones/${id}/fund`)).data,
  releasePayment: async (id) => (await apiClient.post(`/payments/${id}/release`)).data,
  refundPayment: async (id) => (await apiClient.post(`/payments/${id}/refund`)).data,
  getPayment: async (id) => (await apiClient.get(`/payments/${id}`)).data,
  getContractPayments: async (id) => (await apiClient.get(`/contracts/${id}/payments`)).data || [],
  getMilestonePayment: async (id) => (await apiClient.get(`/milestones/${id}/payment`)).data,
  getMyPayments: async () => (await apiClient.get('/me/payments')).data || [],
  getMyWallet: async () => (await apiClient.get('/me/wallet')).data,
  getMyEarnings: async () => (await apiClient.get('/me/earnings')).data,
  getMyLedger: async () => (await apiClient.get('/me/ledger')).data || [],
};
