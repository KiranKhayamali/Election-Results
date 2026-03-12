import axios from 'axios';
import { OverviewData, Party, PartyStanding, Constituency, Candidate } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Election APIs
export const getElectionOverview = async (): Promise<OverviewData> => {
  const response = await axios.get(`${API_BASE_URL}/elections/overview`);
  return response.data;
};

export const getLeadingCandidates = async () => {
  const response = await axios.get(`${API_BASE_URL}/elections/leading-candidates`);
  return response.data;
};

export const getAllProvincesResults = async () => {
  const response = await axios.get(`${API_BASE_URL}/elections/all-provinces`);
  return response.data;
};

export const getRecentUpdates = async (limit = 20, skip = 0, source?: string) => {
  const params = new URLSearchParams({ limit: limit.toString(), skip: skip.toString() });
  if (source) params.append('source', source);
  
  const response = await axios.get(`${API_BASE_URL}/elections/updates?${params}`);
  return response.data;
};

export const getProvinceResults = async (provinceNumber: number) => {
  const response = await axios.get(`${API_BASE_URL}/elections/province/${provinceNumber}`);
  return response.data;
};

export const triggerManualUpdate = async () => {
  const response = await axios.post(`${API_BASE_URL}/elections/refresh`);
  return response.data;
};

// Party APIs
export const getAllParties = async (): Promise<{ parties: Party[]; total: number }> => {
  const response = await axios.get(`${API_BASE_URL}/parties`);
  return response.data;
};

export const getPartyStandings = async (): Promise<{ standings: PartyStanding[]; total: number }> => {
  const response = await axios.get(`${API_BASE_URL}/parties/standings`);
  return response.data;
};

export const getPartyById = async (id: string) => {
  const response = await axios.get(`${API_BASE_URL}/parties/${id}`);
  return response.data;
};

// Constituency APIs
export const getAllConstituencies = async (): Promise<{ constituencies: Constituency[]; total: number }> => {
  const response = await axios.get(`${API_BASE_URL}/constituencies`);
  return response.data;
};

export const getConstituenciesByProvince = async (provinceNumber: number) => {
  const response = await axios.get(`${API_BASE_URL}/constituencies/province/${provinceNumber}`);
  return response.data;
};

export const getConstituencyResults = async (id: string) => {
  const response = await axios.get(`${API_BASE_URL}/constituencies/${id}/results`);
  return response.data;
};

// Candidate APIs
export const getAllCandidates = async (limit = 50, skip = 0) => {
  const response = await axios.get(`${API_BASE_URL}/candidates?limit=${limit}&skip=${skip}`);
  return response.data;
};

export const searchCandidates = async (query: string): Promise<{ candidates: Candidate[]; total: number }> => {
  const response = await axios.get(`${API_BASE_URL}/candidates/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const getCandidatesByParty = async (partyId: string) => {
  const response = await axios.get(`${API_BASE_URL}/candidates/party/${partyId}`);
  return response.data;
};

export const getCandidatesByConstituency = async (constituencyId: string) => {
  const response = await axios.get(`${API_BASE_URL}/candidates/constituency/${constituencyId}`);
  return response.data;
};
