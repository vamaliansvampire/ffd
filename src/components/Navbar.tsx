import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { SiteSettings } from '../types';
import { NexoraLogoMark, SafeImage } from './BrandMark';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  settings: SiteSettings;
}

const NAV_LINKS = [
  { label: 'Directory', path: '/directory' },
  { label: 'About', path: '/about' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
  { label: 'Admin', path: '/admin' },
];

export function Navbar({ currentPath, onNavigate, settings }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = (path: string) => {
    setMobileOpen(false);
    onNavigate(path);
  };

  return (
    <div className="sticky top-0 z-40">
      {settings.announcement_enabled && settings.announcement_text && (
        <div className="bg-[#0D111C] border-b border-[#D4AF37]/25 px-4 py-1.5 text-center text-xs text-[#F1D279]">
          {settings.announcement_text}
        </div>
      )}
      <header className="glass-surface border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-md py-1"
          >
            {settings.logo_url ? (
              <SafeImage
                src={settings.logo_url}
                alt={settings.site_name}
                className="w-7 h-7 rounded-md object-cover"
              />
            ) : (
              <NexoraLogoMark className="w-7 h-7 shrink-0" />
            )}
            <span className="font-display text-lg font-bold tracking-tight text-white">
              {settings.site_name || 'NEXORA AI'}
            </span>
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
            {NAV_LINKS.map((item) => {
              const active =
                currentPath === item.path ||
                (item.path === '/directory' && currentPath.startsWith('/ai/')) ||
                (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleLinkClick(item.path)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b ${
                    active
                      ? 'text-[#F1D279] border-[#D4AF37]'
                      : 'text-zinc-300 border-transparent hover:text-white hover:border-white/30'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action + mobile menu button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleLinkClick('/directory')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#06070A] hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            >
              Explore AI
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-white/10 text-zinc-200 hover:bg-white/5"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#080A0F] px-4 py-4 space-y-1">
            {[{ label: 'Home', path: '/' }, ...NAV_LINKS].map((item) => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleLinkClick(item.path)}
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#D4AF37]/15 text-[#F1D279]'
                      : 'text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleLinkClick('/directory')}
                className="w-full py-3 px-4 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold text-center"
              >
                Explore AI Assistants
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
