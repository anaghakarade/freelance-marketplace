import { apiClient } from './apiClient';

export const contractApi = {
  // Get all contracts for the current authenticated user
  async getMyContracts() {
    const res = await apiClient.get('/contracts');
    return res?.contracts || res?.data?.contracts || (Array.isArray(res) ? res : []);
  },

  // Get single contract by ID
  async getContractById(id) {
    const res = await apiClient.get(`/contracts/${id}`);
    return res?.data ?? res;
  },

  // Get active contract for a project
  async getContractByProject(projectId) {
    const res = await apiClient.get(`/projects/${projectId}/contract`);
    return res?.data ?? res;
  },

  // Get milestones for a contract
  async getMilestones(contractId) {
    const res = await apiClient.get(`/contracts/${contractId}/milestones`);
    return res?.data ?? res; // { milestones: [...], progress: {...} }
  },

  // Create a new milestone for a contract
  async createMilestone(contractId, milestoneData) {
    const res = await apiClient.post(`/contracts/${contractId}/milestones`, milestoneData);
    return res?.data ?? res;
  },

  // Get single milestone by ID
  async getMilestoneById(id) {
    const res = await apiClient.get(`/milestones/${id}`);
    return res?.data ?? res;
  },

  // Contract participants may edit a milestone while it is pending.
  async updateMilestone(id, milestoneData) {
    const res = await apiClient.patch(`/milestones/${id}`, milestoneData);
    return res?.data ?? res;
  },

  // Freelancer starts milestone work
  async startMilestone(id) {
    const res = await apiClient.post(`/milestones/${id}/start`);
    return res?.data ?? res;
  },

  // Freelancer submits milestone work
  async submitMilestone(id, submissionData) {
    const res = await apiClient.post(`/milestones/${id}/submissions`, submissionData);
    return res?.data ?? res;
  },

  // Buyer approves milestone
  async approveMilestone(id, message = '') {
    const res = await apiClient.post(`/milestones/${id}/approve`, { message });
    return res?.data ?? res;
  },

  // Buyer requests revision
  async requestRevision(id, message) {
    const res = await apiClient.post(`/milestones/${id}/request-revision`, { message });
    return res?.data ?? res;
  },

  // Get submission history for a milestone
  async getSubmissions(milestoneId) {
    const res = await apiClient.get(`/milestones/${milestoneId}/submissions`);
    return res?.submissions || res?.data?.submissions || (Array.isArray(res) ? res : res?.data ?? []);
  },
};
