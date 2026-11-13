import { ArrowUpRight, ExternalLink } from 'lucide-react';
import type { AiListing } from '../types';
import { api } from '../lib/api';
import { SafeImage } from './BrandMark';

interface ListingCardProps {
  listing: AiListing;
  onViewDetails: (slug: string) => void;
  onVisitRecorded?: (slug: string, newCount: number) => void;
}

function formatDate(raw: string | null): string {
  if (!raw) return 'Unpublished';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ListingCard({
  listing,
  onViewDetails,
  onVisitRecorded,
}: ListingCardProps) {
  const handleVisitClick = () => {
    api
      .trackListingVisit(listing.slug)
      .then((res) => onVisitRecorded?.(listing.slug, res.visit_count))
      .catch(() => {});
  };

  return (
    <article className="group glass-surface rounded-xl overflow-hidden flex flex-col transition-colors duration-200 hover:border-[#D4AF37]/40">
      <button
        type="button"
        onClick={() => onViewDetails(listing.slug)}
        className="relative aspect-[16/10] w-full overflow-hidden bg-[#0A0C12] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      >
        <SafeImage
          src={listing.logo_url}
          alt={`${listing.name} logo`}
          fallbackTitle={listing.name}
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070A] via-[#06070A]/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold tracking-tight text-white truncate">
              {listing.name}
            </h3>
            {listing.is_example && (
              <span className="text-[11px] font-medium text-[#F1D279]">
                Example Listing
              </span>
            )}
          </div>
          <span className="font-mono text-xs text-zinc-300 tabular-nums shrink-0">
            {listing.visit_count} visits
          </span>
        </div>
      </button>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          {/* Unboxed clean metadata line per Zero-Pill policy */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span className="text-[#F1D279] font-medium">
              {listing.category_name || 'Other AI Tools'}
            </span>
            {listing.tags.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[180px]">{listing.tags.slice(0, 3).join(', ')}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(listing.published_at || listing.created_at)}</span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
            {listing.short_description}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
          <a
            href={listing.website_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleVisitClick}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold hover:bg-[#E5C158] transition-colors whitespace-nowrap"
          >
            <span>Visit AI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onViewDetails(listing.slug)}
            className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-lg border border-white/15 text-zinc-200 text-sm font-medium hover:border-[#60A5FA]/50 hover:text-white transition-colors whitespace-nowrap"
          >
            <span>Details</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
