import { useEffect, useState } from 'react';
import {
  Activity,
  FolderTree,
  Globe,
  HelpCircle,
  Home,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
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
import { SafeImage } from '../components/BrandMark';
import { api } from '../lib/api';

type AdminTab =
  | 'overview'
  | 'listings'
  | 'categories'
  | 'homepage'
  | 'faqs'
  | 'contacts'
  | 'settings'
  | 'profile'
  | 'logs';

interface AdminDashboardPageProps {
  admin: AdminUser;
  onAdminUpdate: (admin: AdminUser) => void;
  onLogout: () => void;
  onPublicDataChanged: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function AdminDashboardPage({
  admin,
  onAdminUpdate,
  onLogout,
  onPublicDataChanged,
}: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Overview state
  const [stats, setStats] = useState({
    totalPublished: 0,
    totalDrafts: 0,
    featuredCount: 0,
    totalCategories: 0,
    totalVisits: 0,
    totalContacts: 0,
    unreadContacts: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);

  // AI Listings Publishing state
  const [listings, setListings] = useState<AiListing[]>([]);
  const [listingStatusFilter, setListingStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingListing, setEditingListing] = useState<Partial<AiListing> | null>(null);
  const [featuresText, setFeaturesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [screenshotsText, setScreenshotsText] = useState('');

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catForm, setCatForm] = useState<{ id?: number; name: string; description: string }>({
    name: '',
    description: '',
  });

  // Homepage state
  const [homepageForm, setHomepageForm] = useState<HomepageContent | null>(null);

  // FAQs state
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqForm, setFaqForm] = useState<{ id?: number; question: string; answer: string }>({
    question: '',
    answer: '',
  });

  // Contacts state
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [contactFilter, setContactFilter] = useState<'all' | 'unread'>('all');
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);

  // Settings state
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);

  // Profile & Password state
  const [profileName, setProfileName] = useState(admin.name);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Logs state
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);

  const showSuccess = (text: string) => {
    setBanner({ type: 'success', text });
    setTimeout(() => setBanner(null), 4000);
  };

  const showError = (err: unknown) => {
    setBanner({
      type: 'error',
      text: err instanceof Error ? err.message : 'Operation failed.',
    });
  };

  const loadAllAdminData = async () => {
    try {
      const [ov, lstRes, catRes, faqRes, contactRes, logsRes, bootRes] = await Promise.all([
        api.adminOverview(),
        api.adminGetListings(),
        api.adminGetCategories(),
        api.adminGetFaqs(),
        api.adminGetContacts(),
        api.adminGetLogs(100),
        api.getBootstrap(),
      ]);
      setStats(ov.stats);
      setRecentLogs(ov.recentLogs);
      setListings(lstRes.listings);
      setCategories(catRes.categories);
      setFaqs(faqRes.faqs);
      setContacts(contactRes.messages);
      setAllLogs(logsRes.logs);
      setHomepageForm(bootRes.homepage);
      setSettingsForm(bootRes.settings);
    } catch (err) {
      showError(err);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'listings', label: 'AI Publishing', icon: Layers },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'homepage', label: 'Homepage', icon: Home },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    { id: 'contacts', label: 'Messages', icon: Mail },
    { id: 'settings', label: 'Branding & Settings', icon: Globe },
    { id: 'profile', label: 'Profile & Password', icon: Shield },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
  ];

  // ==================== HANDLERS ====================

  const handleUploadImage = async (file: File, onUrl: (url: string) => void) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.adminUploadImage(file.name, dataUrl);
      onUrl(res.url);
      showSuccess('Image uploaded successfully.');
    } catch (err) {
      showError(err);
    }
  };

  const openNewListing = () => {
    setEditingListing({
      name: '',
      logo_url: '',
      short_description: '',
      full_description: '',
      website_url: '',
      category_id: categories[0]?.id ?? null,
      creator_name: '',
      status: 'published',
      is_featured: false,
      is_example: false,
    });
    setFeaturesText('');
    setTagsText('');
    setScreenshotsText('');
  };

  const openEditListing = (l: AiListing) => {
    setEditingListing({ ...l });
    setFeaturesText((l.features || []).join('\n'));
    setTagsText((l.tags || []).join(', '));
    setScreenshotsText((l.screenshots || []).join('\n'));
  };

  const saveListingWithStatus = async (targetStatus: 'draft' | 'published') => {
    if (!editingListing) return;
    const features = featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const screenshots = screenshotsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const payload = {
        ...editingListing,
        status: targetStatus,
        features,
        tags,
        screenshots,
      };
      if (editingListing.id) {
        await api.adminUpdateListing(editingListing.id, payload);
        showSuccess(`Updated ${editingListing.name} (${targetStatus}).`);
      } else {
        await api.adminCreateListing(payload);
        showSuccess(
          targetStatus === 'published'
            ? `Published ${editingListing.name} to directory.`
            : `Saved ${editingListing.name} as draft.`
        );
      }
      setEditingListing(null);
      await loadAllAdminData();
      onPublicDataChanged();
    } catch (err) {
      showError(err);
    }
  };

  const handleToggleListingStatus = async (l: AiListing) => {
    const nextStatus = l.status === 'published' ? 'draft' : 'published';
    try {
      await api.adminUpdateListing(l.id, { status: nextStatus });
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess(`${l.name} is now ${nextStatus}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleToggleFeatured = async (l: AiListing) => {
    try {
      await api.adminUpdateListing(l.id, { is_featured: !l.is_featured });
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess(`${l.name} ${!l.is_featured ? 'featured' : 'unfeatured'}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteListing = async (l: AiListing) => {
    try {
      await api.adminDeleteListing(l.id);
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess(`Deleted ${l.name}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await api.adminUpdateCategory(catForm.id, {
          name: catForm.name,
          description: catForm.description,
        });
        showSuccess('Category updated.');
      } else {
        await api.adminCreateCategory({
          name: catForm.name,
          description: catForm.description,
        });
        showSuccess('Category created.');
      }
      setCatForm({ name: '', description: '' });
      await loadAllAdminData();
      onPublicDataChanged();
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteCategory = async (c: Category) => {
    try {
      await api.adminDeleteCategory(c.id);
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess(`Deleted category ${c.name}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (faqForm.id) {
        await api.adminUpdateFaq(faqForm.id, {
          question: faqForm.question,
          answer: faqForm.answer,
        });
        showSuccess('FAQ updated.');
      } else {
        await api.adminCreateFaq({
          question: faqForm.question,
          answer: faqForm.answer,
        });
        showSuccess('FAQ added.');
      }
      setFaqForm({ question: '', answer: '' });
      await loadAllAdminData();
      onPublicDataChanged();
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteFaq = async (f: FaqItem) => {
    try {
      await api.adminDeleteFaq(f.id);
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess('FAQ deleted.');
    } catch (err) {
      showError(err);
    }
  };

  const handleSaveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepageForm) return;
    try {
      const res = await api.adminUpdateHomepage(homepageForm);
      setHomepageForm(res.homepage);
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess('Homepage sections updated.');
    } catch (err) {
      showError(err);
    }
  };

  const handleToggleContactRead = async (m: ContactMessage) => {
    try {
      await api.adminMarkContactRead(m.id, !m.is_read);
      await loadAllAdminData();
      if (selectedContact?.id === m.id) {
        setSelectedContact({ ...m, is_read: !m.is_read });
      }
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteContact = async (m: ContactMessage) => {
    try {
      await api.adminDeleteContact(m.id);
      if (selectedContact?.id === m.id) setSelectedContact(null);
      await loadAllAdminData();
      showSuccess('Contact message deleted.');
    } catch (err) {
      showError(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    try {
      const res = await api.adminUpdateSettings(settingsForm);
      setSettingsForm(res.settings);
      await loadAllAdminData();
      onPublicDataChanged();
      showSuccess('Website branding and settings saved.');
    } catch (err) {
      showError(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.adminUpdateProfile(profileName);
      onAdminUpdate(res.admin);
      await loadAllAdminData();
      showSuccess('Administrator profile updated.');
    } catch (err) {
      showError(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showError(new Error('New password and confirmation do not match.'));
      return;
    }
    try {
      const res = await api.adminChangePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await loadAllAdminData();
      showSuccess(res.message);
    } catch (err) {
      showError(err);
    }
  };

  const filteredListings =
    listingStatusFilter === 'all'
      ? listings
      : listings.filter((l) => l.status === listingStatusFilter);

  const filteredContacts =
    contactFilter === 'unread' ? contacts.filter((c) => !c.is_read) : contacts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 glass-surface rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <div className="font-display text-sm font-bold text-white">{admin.name}</div>
              <div className="text-xs text-zinc-400 truncate max-w-[180px]">{admin.email}</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-white/10 text-zinc-300"
              aria-label="Toggle admin menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          <nav
            className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block space-y-1`}
            aria-label="Admin sections"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#D4AF37]/15 text-[#F1D279] border border-[#D4AF37]/30'
                      : 'text-zinc-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'contacts' && stats.unreadContacts > 0 && (
                    <span className="font-mono text-xs text-[#F1D279] tabular-nums">
                      {stats.unreadContacts}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Viewport */}
        <main className="lg:col-span-9 space-y-6">
          <div className="glass-surface rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-400">
              <span>Admin</span>
              <span className="mx-2">/</span>
              <span className="text-white font-medium">
                {navItems.find((i) => i.id === activeTab)?.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('listings');
                openNewListing();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-xs font-semibold hover:bg-[#E5C158] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish New AI</span>
            </button>
          </div>

          {banner && (
            <div
              role="status"
              className={`px-4 py-3 rounded-lg text-sm border ${
                banner.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {banner.text}
            </div>
          )}

          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Published AI', value: stats.totalPublished },
                  { label: 'Saved Drafts', value: stats.totalDrafts },
                  { label: 'Categories', value: stats.totalCategories },
                  { label: 'Tracked Visits', value: stats.totalVisits },
                ].map((kpi, idx) => (
                  <div key={idx} className="glass-surface rounded-xl p-4 space-y-1">
                    <div className="text-xs text-zinc-400">{kpi.label}</div>
                    <div className="font-display text-2xl font-bold text-white tabular-nums">
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-surface rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-white">
                    Recent Admin Activity
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className="text-xs text-[#F1D279] hover:text-white"
                  >
                    View All Logs
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-white/[0.08] text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Timestamp</th>
                        <th className="py-2.5 px-4 font-medium">Action</th>
                        <th className="py-2.5 px-4 font-medium">Details</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-mono text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                            {log.created_at}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-white whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300">{log.details}</td>
                          <td
                            className={`py-2.5 px-4 font-mono text-xs whitespace-nowrap ${
                              log.status === 'SUCCESS'
                                ? 'text-emerald-400'
                                : log.status === 'LOCKED'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {log.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. AI PUBLISHING & LISTINGS */}
          {activeTab === 'listings' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(['all', 'published', 'draft'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setListingStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                        listingStatusFilter === st
                          ? 'bg-[#D4AF37] text-[#06070A]'
                          : 'border border-white/15 text-zinc-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={openNewListing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold hover:bg-[#E5C158] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New AI Listing</span>
                </button>
              </div>

              {editingListing && (
                <div className="glass-surface-gold rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-white">
                      {editingListing.id ? `Edit ${editingListing.name}` : 'Publish New AI Listing'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingListing(null)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">AI Name</label>
                      <input
                        type="text"
                        required
                        value={editingListing.name || ''}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, name: e.target.value })
                        }
                        placeholder="e.g. Claude, Perplexity, Midjourney"
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">
                        External AI Website URL
                      </label>
                      <input
                        type="url"
                        required
                        value={editingListing.website_url || ''}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, website_url: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">Category</label>
                      <select
                        value={editingListing.category_id ?? ''}
                        onChange={(e) =>
                          setEditingListing({
                            ...editingListing,
                            category_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">
                        Creator / Organization Name (optional)
                      </label>
                      <input
                        type="text"
                        value={editingListing.creator_name || ''}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, creator_name: e.target.value })
                        }
                        placeholder="Company or creator name"
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">AI Logo / Cover Image</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={editingListing.logo_url || ''}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, logo_url: e.target.value })
                        }
                        placeholder="/uploads/... or https://..."
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleUploadImage(f, (url) =>
                                setEditingListing((prev) => (prev ? { ...prev, logo_url: url } : prev))
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">Short Description</label>
                    <textarea
                      required
                      rows={2}
                      value={editingListing.short_description || ''}
                      onChange={(e) =>
                        setEditingListing({ ...editingListing, short_description: e.target.value })
                      }
                      placeholder="Concise 1–2 sentence summary displayed on directory cards..."
                      className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">Full Description</label>
                    <textarea
                      required
                      rows={4}
                      value={editingListing.full_description || ''}
                      onChange={(e) =>
                        setEditingListing({ ...editingListing, full_description: e.target.value })
                      }
                      placeholder="Detailed overview shown on the AI details page..."
                      className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={tagsText}
                        onChange={(e) => setTagsText(e.target.value)}
                        placeholder="Coding, Assistant, Free Tier"
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-300 mb-1">
                        Features (one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={featuresText}
                        onChange={(e) => setFeaturesText(e.target.value)}
                        placeholder="Code autocomplete&#10;Document summarization"
                        className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-zinc-300">
                        Screenshots (one URL per line)
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs text-[#F1D279] cursor-pointer hover:text-white">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Screenshot</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleUploadImage(f, (url) =>
                                setScreenshotsText((prev) => (prev ? `${prev}\n${url}` : url))
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={screenshotsText}
                      onChange={(e) => setScreenshotsText(e.target.value)}
                      placeholder="/uploads/screenshot1.png"
                      className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-200">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingListing.is_featured)}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, is_featured: e.target.checked })
                        }
                      />
                      <span>Feature on Homepage</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingListing.is_example)}
                        onChange={(e) =>
                          setEditingListing({ ...editingListing, is_example: e.target.checked })
                        }
                      />
                      <span>Mark as Example Listing</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setEditingListing(null)}
                      className="px-4 py-2 rounded-lg border border-white/15 text-sm text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveListingWithStatus('draft')}
                      className="px-4 py-2 rounded-lg border border-[#60A5FA]/40 text-sm text-[#93C5FD] hover:bg-[#3B82F6]/10"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => saveListingWithStatus('published')}
                      className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold hover:bg-[#E5C158]"
                    >
                      Publish Immediately
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-surface rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/[0.08] text-xs text-zinc-400">
                      <tr>
                        <th className="py-3 px-4 font-medium">AI Listing</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium">Featured</th>
                        <th className="py-3 px-4 font-medium">Visits</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredListings.map((l) => (
                        <tr key={l.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <SafeImage
                                src={l.logo_url}
                                alt={l.name}
                                className="w-9 h-9 rounded-lg object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate">
                                  {l.name}{' '}
                                  {l.is_example && (
                                    <span className="text-[11px] font-normal text-[#F1D279]">
                                      (Example)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-400 truncate max-w-[200px]">
                                  {l.website_url}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-300">
                            {l.category_name || 'Other AI Tools'}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleListingStatus(l)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                                l.status === 'published'
                                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                                  : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                              }`}
                            >
                              {l.status === 'published' ? 'Published' : 'Draft'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(l)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                                l.is_featured
                                  ? 'border-[#D4AF37]/40 text-[#F1D279] bg-[#D4AF37]/10'
                                  : 'border-white/15 text-zinc-400'
                              }`}
                            >
                              {l.is_featured ? 'Featured' : 'Standard'}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-zinc-300 tabular-nums">
                            {l.visit_count}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditListing(l)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/15 text-xs text-zinc-200 hover:bg-white/5"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteListing(l)}
                              aria-label={`Delete ${l.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveCategory}
                className="md:col-span-5 glass-surface rounded-xl p-5 space-y-4 h-fit"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  {catForm.id ? 'Edit Category' : 'Add Category'}
                </h2>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div className="flex gap-2">
                  {catForm.id && (
                    <button
                      type="button"
                      onClick={() => setCatForm({ name: '', description: '' })}
                      className="px-4 py-2 rounded-lg border border-white/15 text-sm text-zinc-300"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
                  >
                    {catForm.id ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>

              <div className="md:col-span-7 glass-surface rounded-xl divide-y divide-white/[0.06]">
                {categories.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-white">
                        {c.name}{' '}
                        <span className="font-mono text-xs text-zinc-400 tabular-nums">
                          ({c.listing_count || 0})
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">{c.description}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setCatForm({ id: c.id, name: c.name, description: c.description })
                        }
                        className="px-2.5 py-1.5 rounded-md border border-white/15 text-xs text-zinc-200 hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c)}
                        className="px-2.5 py-1.5 rounded-md border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. HOMEPAGE */}
          {activeTab === 'homepage' && homepageForm && (
            <form onSubmit={handleSaveHomepage} className="glass-surface rounded-xl p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-white">
                Homepage Content Management
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Hero Heading</label>
                  <input
                    type="text"
                    required
                    value={homepageForm.hero_heading}
                    onChange={(e) =>
                      setHomepageForm({ ...homepageForm, hero_heading: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Hero CTA Button Label</label>
                  <input
                    type="text"
                    required
                    value={homepageForm.hero_cta_label}
                    onChange={(e) =>
                      setHomepageForm({ ...homepageForm, hero_cta_label: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Hero Subtitle</label>
                <textarea
                  required
                  rows={2}
                  value={homepageForm.hero_subtitle}
                  onChange={(e) =>
                    setHomepageForm({ ...homepageForm, hero_subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Hero Background Image</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={homepageForm.hero_image_url}
                    onChange={(e) =>
                      setHomepageForm({ ...homepageForm, hero_image_url: e.target.value })
                    }
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Hero</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleUploadImage(f, (url) =>
                            setHomepageForm((prev) =>
                              prev ? { ...prev, hero_image_url: url } : prev
                            )
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">About Section Heading</label>
                <input
                  type="text"
                  required
                  value={homepageForm.about_heading}
                  onChange={(e) =>
                    setHomepageForm({ ...homepageForm, about_heading: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">About Section Body</label>
                <textarea
                  required
                  rows={3}
                  value={homepageForm.about_body}
                  onChange={(e) =>
                    setHomepageForm({ ...homepageForm, about_body: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold hover:bg-[#E5C158]"
              >
                Save Homepage Content
              </button>
            </form>
          )}

          {/* 5. FAQS MANAGEMENT */}
          {activeTab === 'faqs' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveFaq}
                className="md:col-span-5 glass-surface rounded-xl p-5 space-y-4 h-fit"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  {faqForm.id ? 'Edit FAQ' : 'Add FAQ'}
                </h2>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Question</label>
                  <input
                    type="text"
                    required
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Answer</label>
                  <textarea
                    required
                    rows={4}
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div className="flex gap-2">
                  {faqForm.id && (
                    <button
                      type="button"
                      onClick={() => setFaqForm({ question: '', answer: '' })}
                      className="px-4 py-2 rounded-lg border border-white/15 text-sm text-zinc-300"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
                  >
                    {faqForm.id ? 'Update FAQ' : 'Add FAQ'}
                  </button>
                </div>
              </form>

              <div className="md:col-span-7 glass-surface rounded-xl divide-y divide-white/[0.06]">
                {faqs.map((f) => (
                  <div key={f.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-medium text-white text-sm">{f.question}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setFaqForm({ id: f.id, question: f.question, answer: f.answer })
                          }
                          className="px-2.5 py-1 rounded-md border border-white/15 text-xs text-zinc-200 hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(f)}
                          className="px-2.5 py-1 rounded-md border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. CONTACT MESSAGES */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Contact Inbox</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContactFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      contactFilter === 'all'
                        ? 'bg-[#D4AF37] text-[#06070A]'
                        : 'border border-white/15 text-zinc-300'
                    }`}
                  >
                    All ({contacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactFilter('unread')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      contactFilter === 'unread'
                        ? 'bg-[#D4AF37] text-[#06070A]'
                        : 'border border-white/15 text-zinc-300'
                    }`}
                  >
                    Unread ({stats.unreadContacts})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 glass-surface rounded-xl divide-y divide-white/[0.06] max-h-[500px] overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-zinc-400">
                      No contact messages in this view.
                    </div>
                  ) : (
                    filteredContacts.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedContact(m)}
                        className={`w-full p-4 text-left hover:bg-white/[0.03] transition-colors ${
                          selectedContact?.id === m.id ? 'bg-[#D4AF37]/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-white truncate">
                            {m.subject}
                          </span>
                          {!m.is_read && (
                            <span className="text-[11px] font-mono text-[#F1D279] shrink-0">
                              UNREAD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 truncate">
                          {m.name} · {m.email}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="md:col-span-7 glass-surface rounded-xl p-6">
                  {!selectedContact ? (
                    <div className="text-sm text-zinc-400 text-center py-16">
                      Select a message to read details.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/[0.08]">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-white">
                            {selectedContact.subject}
                          </h3>
                          <div className="text-xs text-zinc-400 mt-1">
                            From {selectedContact.name} ({selectedContact.email}) ·{' '}
                            <span className="font-mono tabular-nums">
                              {selectedContact.created_at}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleContactRead(selectedContact)}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5"
                          >
                            {selectedContact.is_read ? 'Mark Unread' : 'Mark Read'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(selectedContact)}
                            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {selectedContact.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. BRANDING & SETTINGS */}
          {activeTab === 'settings' && settingsForm && (
            <form onSubmit={handleSaveSettings} className="glass-surface rounded-xl p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-white">
                Branding, Announcements & Footer Settings
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Website Name</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.site_name}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, site_name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Tagline</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Logo URL (or upload)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settingsForm.logo_url}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, logo_url: e.target.value })
                      }
                      placeholder="Leave empty for SVG logo"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                    />
                    <label className="inline-flex items-center px-3 py-2 rounded-lg border border-white/15 text-xs text-zinc-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            handleUploadImage(f, (url) =>
                              setSettingsForm((prev) => (prev ? { ...prev, logo_url: url } : prev))
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Favicon URL</label>
                  <input
                    type="text"
                    value={settingsForm.favicon_url}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, favicon_url: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={settingsForm.contact_email}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, contact_email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={settingsForm.contact_phone}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Contact Location</label>
                <input
                  type="text"
                  value={settingsForm.contact_location}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contact_location: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                />
              </div>

              <div className="border-t border-white/[0.08] pt-4 space-y-3">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.announcement_enabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        announcement_enabled: e.target.checked,
                      })
                    }
                  />
                  <span>Enable Top Announcement Banner</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.announcement_text}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, announcement_text: e.target.value })
                  }
                  placeholder="Announcement text..."
                  className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                />
              </div>

              <div className="border-t border-white/[0.08] pt-4 space-y-3">
                <h3 className="font-display text-sm font-semibold text-white">
                  Footer Social Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['twitter', 'linkedin', 'github', 'youtube', 'discord', 'website'] as const).map(
                    (key) => (
                      <div key={key}>
                        <label className="block text-xs text-zinc-400 capitalize mb-1">{key}</label>
                        <input
                          type="url"
                          value={settingsForm.social_links[key] || ''}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              social_links: {
                                ...settingsForm.social_links,
                                [key]: e.target.value,
                              },
                            })
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold hover:bg-[#E5C158]"
              >
                Save Website Settings
              </button>
            </form>
          )}

          {/* 8. PROFILE & PASSWORD */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleUpdateProfile} className="glass-surface rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Administrator Profile
                </h2>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Authorized Email</label>
                  <input
                    type="text"
                    disabled
                    value={admin.email}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E]/60 border border-white/10 text-sm text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
                >
                  Update Profile
                </button>
              </form>

              <form onSubmit={handleChangePassword} className="glass-surface rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-white">Change Password</h2>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB]"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* 9. ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <div className="glass-surface rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.08]">
                <h2 className="font-display text-lg font-semibold text-white">
                  Security & Activity Audit Log
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-white/[0.08] text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Timestamp</th>
                      <th className="py-2.5 px-4 font-medium">Actor</th>
                      <th className="py-2.5 px-4 font-medium">Action</th>
                      <th className="py-2.5 px-4 font-medium">Details</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {allLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                          {log.created_at}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-zinc-300">{log.admin_email}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-white whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-300">{log.details}</td>
                        <td
                          className={`py-2.5 px-4 font-mono text-xs whitespace-nowrap ${
                            log.status === 'SUCCESS'
                              ? 'text-emerald-400'
                              : log.status === 'LOCKED'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {log.status}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-zinc-500 tabular-nums">
                          {log.ip_address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
