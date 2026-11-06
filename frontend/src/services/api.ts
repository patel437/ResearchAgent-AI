/**
 * API service layer – all backend calls go through here.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min for AI calls
});

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ─────────────────────────────────────────────────────
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number | null;
  doi: string;
  source_url: string;
  source: string;
  cited_by: number;
  domain: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface DashboardStats {
  total_papers: number;
  total_reports: number;
  total_references: number;
  total_projects: number;
  ibm_connected: boolean;
  cloudant_connected: boolean;
  demo_mode: boolean;
  storage?: {
    backend: string;
    path: string;
    pdf_count: number;
    report_count: number;
    total_bytes: number;
  };
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  getStats: (userId = 'demo-user') =>
    api.get<DashboardStats>(`/dashboard/stats?user_id=${userId}`),
  getActivity: (userId = 'demo-user') =>
    api.get(`/dashboard/activity?user_id=${userId}`),
};

// ── Search ────────────────────────────────────────────────────
export const searchApi = {
  search: (params: {
    q: string;
    year_from?: number;
    year_to?: number;
    domain?: string;
    enhance?: boolean;
    user_id?: string;
  }) => api.get<{ papers: Paper[]; total: number; query: string; enhanced_query: string }>('/search', { params }),
  savePaper: (paper: Paper, userId = 'demo-user', projectId?: string) =>
    api.post('/search/save', { user_id: userId, paper, project_id: projectId }),
  getSaved: (userId = 'demo-user') =>
    api.get(`/search/saved?user_id=${userId}`),
};

// ── Chat ──────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, sessionId?: string, userId = 'demo-user') =>
    api.post<{ response: string; session_id: string }>('/chat', {
      message,
      session_id: sessionId,
      user_id: userId,
    }),
  getHistory: (sessionId: string, userId = 'demo-user') =>
    api.get(`/chat/history/${sessionId}?user_id=${userId}`),
};

// ── Summarizer ────────────────────────────────────────────────
export const summarizerApi = {
  uploadPdf: (file: File, userId = 'demo-user', title = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('user_id', userId);
    form.append('title', title);
    return api.post<{
      summary: string; filename: string; title: string;
      extracted_chars: number; file_id: string; stored_name: string;
      size_bytes: number; word_count: number; storage: string;
    }>(
      '/summarizer/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  summarizeText: (text: string, title = '', userId = 'demo-user') =>
    api.post<{ summary: string; title: string }>('/summarizer/text', { text, title, user_id: userId }),
  downloadSummary: (summary: string, title = '') =>
    api.post('/summarizer/download/summary', { summary, title }, { responseType: 'blob' }),
  listUploads: (userId = 'demo-user') =>
    api.get(`/summarizer/uploads?user_id=${userId}`),
  downloadPdf: (fileId: string, userId = 'demo-user') =>
    api.get(`/summarizer/download/pdf/${fileId}?user_id=${userId}`, { responseType: 'blob' }),
  deleteUpload: (fileId: string, userId = 'demo-user', rev = '') =>
    api.delete(`/summarizer/uploads/${fileId}?user_id=${userId}&rev=${rev}`),
};

// ── Gaps ──────────────────────────────────────────────────────
export const gapsApi = {
  analyze: (topic: string, papers: Paper[], userId = 'demo-user') =>
    api.post<{ gaps: string; topic: string; ai_generated: boolean }>(
      '/gaps/analyze',
      { topic, papers, user_id: userId }
    ),
  fromQuery: (topic: string) =>
    api.post<{ gaps: string; papers_analyzed: Paper[]; topic: string }>(
      '/gaps/from-search',
      { topic }
    ),
};

// ── Hypotheses ────────────────────────────────────────────────
export const hypothesesApi = {
  generate: (topic: string, gaps: string, papers: Paper[], userId = 'demo-user') =>
    api.post<{ hypotheses: string; topic: string; ai_generated: boolean }>(
      '/hypotheses/generate',
      { topic, gaps, papers, user_id: userId }
    ),
};

// ── Reports ───────────────────────────────────────────────────
export const reportsApi = {
  generate: (topic: string, papers: Paper[], context = '', userId = 'demo-user', exportFormat: 'md' | 'docx' = 'md') =>
    api.post<{ report: string; topic: string; saved_id?: string; file_id?: string; format?: string }>(
      '/reports/generate',
      { topic, papers, additional_context: context, user_id: userId, export_format: exportFormat }
    ),
  list: (userId = 'demo-user') =>
    api.get(`/reports/list?user_id=${userId}`),
  get: (reportId: string, userId = 'demo-user') =>
    api.get(`/reports/${reportId}?user_id=${userId}`),
  download: (reportId: string, fmt: 'md' | 'docx' = 'md', userId = 'demo-user') =>
    api.get(`/reports/${reportId}/download?fmt=${fmt}&user_id=${userId}`, { responseType: 'blob' }),
};

// ── References ────────────────────────────────────────────────
export const referencesApi = {
  save: (paper: Paper, userId = 'demo-user') =>
    api.post('/references/save', { user_id: userId, paper }),
  list: (userId = 'demo-user') =>
    api.get(`/references?user_id=${userId}`),
  delete: (refId: string, rev: string, userId = 'demo-user') =>
    api.delete(`/references/${refId}?rev=${rev}&user_id=${userId}`),
  generateCitations: (papers: Paper[]) =>
    api.post('/references/citations', { papers }),
  exportBibtex: (papers: Paper[]) =>
    api.post('/references/bibtex', { papers }),
  exportAll: (userId = 'demo-user') =>
    api.get(`/references/export?user_id=${userId}&fmt=bibtex`),
};

// ── Projects ──────────────────────────────────────────────────
export const projectsApi = {
  create: (name: string, description = '', userId = 'demo-user') =>
    api.post('/projects', { name, description, user_id: userId }),
  list: (userId = 'demo-user') =>
    api.get(`/projects?user_id=${userId}`),
};

export default api;
