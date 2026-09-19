import { apiClient } from './apiClient';

export const reviewApi = {
  create: (contractId, rating, comment) => apiClient.post('/reviews', { contract_id: contractId, rating, comment }),
  eligibility: (contractId) => apiClient.get(`/contracts/${contractId}/review-eligibility`),
  get: (id) => apiClient.get(`/reviews/${id}`),
  update: (id, rating, comment) => apiClient.patch(`/reviews/${id}`, { rating, comment }),
  remove: (id) => apiClient.delete(`/reviews/${id}`),
  received: (userId, page = 1, limit = 10) => apiClient.get(`/users/${userId}/reviews?page=${page}&limit=${limit}`),
  trust: (userId) => apiClient.get(`/users/${userId}/trust`),
};
