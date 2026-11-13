import type {
  ActivityLog,
  AdminUser,
  AiListing,
  Category,
  ContactMessage,
  FaqItem,
  HomepageContent,
  SiteSettings,
} from '../types';

export interface BootstrapData {
  settings: SiteSettings;
  homepage: HomepageContent;
  categories: Category[];
  faqs: FaqItem[];
  listings: AiListing[];
}

let csrfTokenMemory = '';

export function setCsrfToken(token: string) {
  csrfTokenMemory = token;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const method = (options.method || 'GET').toUpperCase();
  if (csrfTokenMemory && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set('X-CSRF-Token', csrfTokenMemory);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMessage =
      typeof data?.error === 'string' && data.error
        ? data.error
        : `Request failed with status ${res.status}`;
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return data as T;
}

export const api = {
  getBootstrap: () => apiRequest<BootstrapData>('/api/public/bootstrap'),

  searchListings: (params: {
    q?: string;
    category?: string;
    featured?: boolean;
    sort?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    if (params.featured) qs.set('featured', 'true');
    if (params.sort) qs.set('sort', params.sort);
    return apiRequest<{ listings: AiListing[] }>(`/api/listings?${qs.toString()}`);
  },

  getListingBySlug: (slug: string) =>
    apiRequest<{ listing: AiListing }>(`/api/listings/${encodeURIComponent(slug)}`),

  trackListingVisit: (slug: string) =>
    apiRequest<{ visit_count: number }>(`/api/listings/${encodeURIComponent(slug)}/visit`, {
      method: 'POST',
    }),

  submitContact: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) =>
    apiRequest<{ id: number; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth (Email + Password only, zero OTP)
  login: async (email: string, password: string) => {
    const res = await apiRequest<{ admin: AdminUser; csrfToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCsrfToken(res.csrfToken);
    return res;
  },

  me: async () => {
    const res = await apiRequest<{
      authenticated: boolean;
      admin: AdminUser;
      csrfToken: string;
    }>('/api/auth/me');
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  logout: async () => {
    const res = await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setCsrfToken('');
    return res;
  },

  // Admin
  adminOverview: () =>
    apiRequest<{
      stats: {
        totalPublished: number;
        totalDrafts: number;
        featuredCount: number;
        totalCategories: number;
        totalVisits: number;
        totalContacts: number;
        unreadContacts: number;
      };
      recentLogs: ActivityLog[];
    }>('/api/admin/overview'),

  adminUploadImage: (filename: string, dataUrl: string) =>
    apiRequest<{ url: string }>('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, dataUrl }),
    }),

  adminGetListings: () => apiRequest<{ listings: AiListing[] }>('/api/admin/listings'),

  adminCreateListing: (payload: Partial<AiListing>) =>
    apiRequest<{ listing: AiListing }>('/api/admin/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateListing: (id: number, payload: Partial<AiListing>) =>
    apiRequest<{ listing: AiListing }>(`/api/admin/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminDeleteListing: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/api/admin/listings/${id}`, { method: 'DELETE' }),

  adminGetCategories: () => apiRequest<{ categories: Category[] }>('/api/admin/categories'),

  adminCreateCategory: (payload: { name: string; description: string }) =>
    apiRequest<{ category: Category }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateCategory: (id: number, payload: { name: string; description: string }) =>
    apiRequest<{ category: Category }>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminDeleteCategory: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  adminGetFaqs: () => apiRequest<{ faqs: FaqItem[] }>('/api/admin/faqs'),

  adminCreateFaq: (payload: { question: string; answer: string }) =>
    apiRequest<{ faq: FaqItem }>('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateFaq: (id: number, payload: { question: string; answer: string }) =>
    apiRequest<{ faq: FaqItem }>(`/api/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminDeleteFaq: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/api/admin/faqs/${id}`, { method: 'DELETE' }),

  adminUpdateHomepage: (payload: HomepageContent) =>
    apiRequest<{ homepage: HomepageContent }>('/api/admin/homepage', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminGetContacts: () => apiRequest<{ messages: ContactMessage[] }>('/api/admin/contacts'),

  adminMarkContactRead: (id: number, is_read: boolean) =>
    apiRequest<{ ok: boolean; is_read: boolean }>(`/api/admin/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read }),
    }),

  adminDeleteContact: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/api/admin/contacts/${id}`, { method: 'DELETE' }),

  adminUpdateSettings: (payload: SiteSettings) =>
    apiRequest<{ settings: SiteSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminUpdateProfile: (name: string) =>
    apiRequest<{ admin: AdminUser }>('/api/admin/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  adminChangePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean; message: string }>('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  adminGetLogs: (limit = 100) =>
    apiRequest<{ logs: ActivityLog[] }>(`/api/admin/logs?limit=${limit}`),
};
