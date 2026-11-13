import type { SiteSettings } from '../types';
import { NexoraLogoMark, SafeImage } from './BrandMark';

interface FooterProps {
  onNavigate: (path: string) => void;
  settings: SiteSettings;
}

export function Footer({ onNavigate, settings }: FooterProps) {
  const socialEntries = Object.entries(settings.social_links || {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

  const socialLabels: Record<string, string> = {
    twitter: 'X / Twitter',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    youtube: 'YouTube',
    discord: 'Discord',
    website: 'Website',
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#050608] text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              {settings.logo_url ? (
                <SafeImage
                  src={settings.logo_url}
                  alt={settings.site_name}
                  className="w-7 h-7 rounded-md object-cover"
                />
              ) : (
                <NexoraLogoMark className="w-7 h-7" />
              )}
              <span className="font-display text-lg font-bold text-white">
                {settings.site_name || 'NEXORA AI'}
              </span>
            </div>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              {settings.tagline || 'The Universe of AI Assistants'} — curated directory and
              publishing platform connecting visitors with external AI tools across the industry.
            </p>
            {(settings.contact_email || settings.contact_location) && (
              <div className="text-xs text-zinc-500 space-y-1 pt-1">
                {settings.contact_email && <div>{settings.contact_email}</div>}
                {settings.contact_phone && <div>{settings.contact_phone}</div>}
                {settings.contact_location && <div>{settings.contact_location}</div>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Directory</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Home', path: '/' },
                { label: 'AI Assistant Directory', path: '/directory' },
                { label: 'About NEXORA', path: '/about' },
                { label: 'FAQ', path: '/faq' },
                { label: 'Contact', path: '/contact' },
              ].map((link) => (
                <li key={link.path}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.path)}
                    className="hover:text-[#F1D279] transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Platform & Social</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className="hover:text-[#F1D279] transition-colors"
                >
                  Admin Dashboard
                </button>
              </li>
              {socialEntries.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#60A5FA] transition-colors"
                  >
                    {socialLabels[key] || key}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>
            © {new Date().getFullYear()} {settings.site_name || 'NEXORA AI'}. All rights reserved.
          </span>
          <span>{settings.tagline || 'The Universe of AI Assistants'}</span>
        </div>
      </div>
    </footer>
  );
}
