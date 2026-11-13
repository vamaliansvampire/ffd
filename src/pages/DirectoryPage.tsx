import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { AiListing, Category } from '../types';
import { ListingCard } from '../components/ListingCard';
import { api } from '../lib/api';

interface DirectoryPageProps {
  initialListings: AiListing[];
  categories: Category[];
  initialQuery?: string;
  initialCategory?: string;
  initialFeatured?: boolean;
  initialSort?: string;
  onNavigate: (path: string) => void;
  onVisitRecorded: (slug: string, newCount: number) => void;
}

export function DirectoryPage({
  initialListings,
  categories,
  initialQuery = '',
  initialCategory = 'all',
  initialFeatured = false,
  initialSort = 'newest',
  onNavigate,
  onVisitRecorded,
}: DirectoryPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured);
  const [sortBy, setSortBy] = useState(initialSort);
  const [results, setResults] = useState<AiListing[]>(initialListings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setSelectedCategory(initialCategory);
    setFeaturedOnly(initialFeatured);
    setSortBy(initialSort);
  }, [initialQuery, initialCategory, initialFeatured, initialSort]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchListings({
          q: query,
          category: selectedCategory,
          featured: featuredOnly,
          sort: sortBy,
        });
        if (active) setResults(res.listings);
      } catch {
        if (active) {
          const q = query.trim().toLowerCase();
          const filtered = initialListings.filter((item) => {
            if (
              q &&
              !item.name.toLowerCase().includes(q) &&
              !item.short_description.toLowerCase().includes(q) &&
              !item.tags.some((t) => t.toLowerCase().includes(q))
            ) {
              return false;
            }
            if (selectedCategory !== 'all' && item.category_slug !== selectedCategory) return false;
            if (featuredOnly && !item.is_featured) return false;
            return true;
          });
          setResults(filtered);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selectedCategory, featuredOnly, sortBy, initialListings]);

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setFeaturedOnly(false);
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-9">
      <div className="max-w-2xl space-y-2.5">
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
          AI Assistant Directory
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
          Browse published AI assistants, filter by category or tags, inspect full capabilities, and launch each external AI platform directly.
        </p>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="glass-surface rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by AI name, description, tag, or creator..."
              aria-label="Search AI directory"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() => setFeaturedOnly((v) => !v)}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                featuredOnly
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F1D279]'
                  : 'bg-[#07090E] border-white/15 text-zinc-300 hover:border-white/30'
              }`}
            >
              {featuredOnly ? 'Showing Featured Only' : 'Filter: Featured Only'}
            </button>
          </div>

          <div className="md:col-span-3 relative">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort AI listings"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="newest">Sort: Newest Published</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="featured">Sort: Featured First</option>
              <option value="name_asc">Sort: Name A–Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#D4AF37] text-[#06070A]'
                : 'bg-[#07090E] text-zinc-300 border border-white/10 hover:border-white/25'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.slug
                  ? 'bg-[#D4AF37] text-[#06070A]'
                  : 'bg-[#07090E] text-zinc-300 border border-white/10 hover:border-white/25'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="tabular-nums">
          {loading ? 'Filtering directory...' : `Showing ${results.length} AI listing(s)`}
        </span>
        {(query || selectedCategory !== 'all' || featuredOnly) && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[#F1D279] hover:text-white transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <div className="glass-surface rounded-xl p-12 text-center space-y-4">
          <p className="text-base text-zinc-300">
            No published AI listings match your search or category filter.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#06070A] text-sm font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onViewDetails={(slug) => onNavigate(`/ai/${slug}`)}
              onVisitRecorded={onVisitRecorded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
