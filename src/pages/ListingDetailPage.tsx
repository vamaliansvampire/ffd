import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Share2 } from 'lucide-react';
import type { AiListing } from '../types';
import { SafeImage } from '../components/BrandMark';
import { api } from '../lib/api';

interface ListingDetailPageProps {
  slug: string;
  cachedListings: AiListing[];
  onNavigate: (path: string) => void;
  onVisitRecorded: (slug: string, newCount: number) => void;
}

export function ListingDetailPage({
  slug,
  cachedListings,
  onNavigate,
  onVisitRecorded,
}: ListingDetailPageProps) {
  const initial = cachedListings.find((l) => l.slug.toLowerCase() === slug.toLowerCase()) || null;
  const [listing, setListing] = useState<AiListing | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .getListingBySlug(slug)
      .then((res) => {
        if (active) setListing(res.listing);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'AI listing not found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleVisit = () => {
    if (!listing) return;
    api
      .trackListingVisit(listing.slug)
      .then((res) => {
        setListing((prev) => (prev ? { ...prev, visit_count: res.visit_count } : prev));
        onVisitRecorded(listing.slug, res.visit_count);
      })
      .catch(() => {});
  };

  const handleShare = async () => {
    if (!listing) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.name} on NEXORA AI`,
          text: listing.short_description,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (loading && !listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass-surface rounded-xl p-10 text-center text-zinc-400">
          Loading AI listing details...
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl font-bold text-white">Listing Unavailable</h1>
        <p className="text-sm text-zinc-400">
          {error || 'The requested AI assistant listing could not be found.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/directory')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <button
        type="button"
        onClick={() => onNavigate('/directory')}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Directory</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Logo / Primary Visual */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-surface rounded-xl overflow-hidden aspect-[4/3]">
            <SafeImage
              src={listing.logo_url}
              alt={`${listing.name} logo`}
              fallbackTitle={listing.name}
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="glass-surface rounded-xl p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Category</span>
              <span className="text-[#F1D279] font-medium">
                {listing.category_name || 'Other AI Tools'}
              </span>
            </div>
            {listing.creator_name && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Creator</span>
                <span className="text-white">{listing.creator_name}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Recorded Visits</span>
              <span className="font-mono text-white tabular-nums">{listing.visit_count}</span>
            </div>
            <div className="pt-2 border-t border-white/[0.06] space-y-1">
              <div className="text-xs text-zinc-400">External Website</div>
              <a
                href={listing.website_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleVisit}
                className="text-xs text-[#60A5FA] hover:underline break-all"
              >
                {listing.website_url}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Full Description, Features, Actions */}
        <div className="lg:col-span-7 space-y-7">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>{listing.category_name || 'Other AI Tools'}</span>
              {listing.tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{listing.tags.join(', ')}</span>
                </>
              )}
              {listing.is_example && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F1D279] font-medium">
                    Example Listing (Admin Editable)
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
              {listing.name}
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
              {listing.short_description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={listing.website_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleVisit}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm hover:bg-[#E5C158] transition-colors whitespace-nowrap"
            >
              <span>Visit AI Website</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-white/15 text-zinc-200 font-medium text-sm hover:border-[#60A5FA]/60 hover:text-white transition-colors whitespace-nowrap"
            >
              {shared ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-[#60A5FA]" />
                  <span>Share Listing</span>
                </>
              )}
            </button>
          </div>

          <div className="glass-surface rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-semibold text-white">Overview</h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {listing.full_description}
            </p>
          </div>

          {listing.features.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-base font-semibold text-white">Key Highlights</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {listing.features.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-zinc-300 bg-[#0D0F15] border border-white/[0.06] rounded-lg px-3.5 py-2.5"
                  >
                    <Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listing.screenshots.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-base font-semibold text-white">Screenshots</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listing.screenshots.map((shot, idx) => (
                  <div
                    key={idx}
                    className="glass-surface rounded-xl overflow-hidden aspect-[16/10]"
                  >
                    <SafeImage
                      src={shot}
                      alt={`${listing.name} screenshot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
