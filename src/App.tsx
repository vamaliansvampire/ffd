import { useCallback, useEffect, useState } from 'react';
import type {
  AdminUser,
  AiListing,
  Category,
  FaqItem,
  HomepageContent,
  SiteSettings,
} from './types';
import { api } from './lib/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { AboutPage, ContactPage, FaqPage } from './pages/InfoPages';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'NEXORA AI',
  tagline: 'The Universe of AI Assistants',
  logo_url: '',
  favicon_url: '/favicon.svg',
  contact_email: '',
  contact_phone: '',
  contact_location: '',
  announcement_text: '',
  announcement_enabled: false,
  social_links: {},
};

const DEFAULT_HOMEPAGE: HomepageContent = {
  hero_heading: 'Discover the Universe of AI',
  hero_subtitle: 'Explore, discover and access powerful AI assistants.',
  hero_cta_label: 'Explore AI Assistants',
  hero_image_url: '',
  about_heading: 'Curated Discovery for External AI Assistants',
  about_body: '',
};

export default function App() {
  const [currentUrl, setCurrentUrl] = useState<string>(
    () => (window.location.pathname || '/') + (window.location.search || '')
  );
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [homepage, setHomepage] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [listings, setListings] = useState<AiListing[]>([]);
  const [bootLoading, setBootLoading] = useState(true);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const loadPublicBootstrap = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      setSettings(data.settings);
      setHomepage(data.homepage);
      setCategories(data.categories);
      setFaqs(data.faqs);
      setListings(data.listings);

      document.title = `${data.settings.site_name} — ${data.homepage.hero_heading}`;
      const favEl = document.getElementById('nexora-favicon') as HTMLLinkElement | null;
      if (favEl && data.settings.favicon_url) {
        favEl.href = data.settings.favicon_url;
      }
    } catch {
      // Retain defaults if offline
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicBootstrap();
    api
      .me()
      .then((res) => {
        if (res.authenticated) setAdminUser(res.admin);
      })
      .catch(() => setAdminUser(null))
      .finally(() => setAuthChecked(true));
  }, [loadPublicBootstrap]);

  useEffect(() => {
    const handlePop = () => {
      setCurrentUrl((window.location.pathname || '/') + (window.location.search || ''));
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', normalized);
    }
    setCurrentUrl(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleVisitRecorded = useCallback((slug: string, newCount: number) => {
    setListings((prev) =>
      prev.map((l) => (l.slug === slug ? { ...l, visit_count: newCount } : l))
    );
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors
    }
    setAdminUser(null);
    navigate('/admin');
  };

  const [pathnamePart, searchPart = ''] = currentUrl.split('?');
  const searchParams = new URLSearchParams(searchPart);

  const renderRoute = () => {
    if (bootLoading) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-24 text-center text-sm text-zinc-400">
          Loading NEXORA AI Directory...
        </div>
      );
    }

    if (pathnamePart === '/' || pathnamePart === '') {
      return (
        <HomePage
          homepage={homepage}
          settings={settings}
          categories={categories}
          faqs={faqs}
          listings={listings}
          onNavigate={navigate}
          onVisitRecorded={handleVisitRecorded}
        />
      );
    }

    if (pathnamePart === '/directory' || pathnamePart === '/assistants') {
      return (
        <DirectoryPage
          initialListings={listings}
          categories={categories}
          initialQuery={searchParams.get('q') || ''}
          initialCategory={searchParams.get('category') || 'all'}
          initialFeatured={searchParams.get('featured') === 'true'}
          initialSort={searchParams.get('sort') || 'newest'}
          onNavigate={navigate}
          onVisitRecorded={handleVisitRecorded}
        />
      );
    }

    if (pathnamePart.startsWith('/ai/')) {
      const slug = decodeURIComponent(pathnamePart.slice('/ai/'.length)).split('/')[0];
      return (
        <ListingDetailPage
          slug={slug}
          cachedListings={listings}
          onNavigate={navigate}
          onVisitRecorded={handleVisitRecorded}
        />
      );
    }

    if (pathnamePart === '/about') {
      return (
        <AboutPage
          homepage={homepage}
          categories={categories}
          listingCount={listings.length}
          onNavigate={navigate}
        />
      );
    }

    if (pathnamePart === '/contact') {
      return <ContactPage settings={settings} />;
    }

    if (pathnamePart === '/faq') {
      return <FaqPage faqs={faqs} onNavigate={navigate} />;
    }

    if (pathnamePart === '/admin' || pathnamePart.startsWith('/admin/')) {
      if (!authChecked) {
        return (
          <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-zinc-400">
            Verifying administrator session...
          </div>
        );
      }
      if (!adminUser) {
        return (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              navigate('/admin');
            }}
            onNavigate={navigate}
          />
        );
      }
      return (
        <AdminDashboardPage
          admin={adminUser}
          onAdminUpdate={setAdminUser}
          onLogout={handleLogout}
          onPublicDataChanged={loadPublicBootstrap}
        />
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-white">Page Not Found</h1>
        <p className="text-sm text-zinc-400">
          The requested page does not exist on {settings.site_name}.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06070A] text-[#F4F4F6]">
      <Navbar currentPath={pathnamePart} onNavigate={navigate} settings={settings} />
      <div className="flex-1">{renderRoute()}</div>
      <Footer onNavigate={navigate} settings={settings} />
    </div>
  );
}
