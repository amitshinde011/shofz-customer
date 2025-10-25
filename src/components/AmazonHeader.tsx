import { useState } from 'react';
import { Search, MessageCircleHeart, MapPin, Menu, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AmazonHeaderProps {
  showSearch?: boolean;
  showLocation?: boolean;
  showCart?: boolean;
}

export default function AmazonHeader({
  showSearch = true,
  showLocation = true,
  showCart = true,
}: AmazonHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-md">
      {/* Main Header */}
      <div className="px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <img
              src="/shofz-logo.png"
              alt="Shofz Logo"
              className="h-10 w-10"
            />
            <div className="text-xl font-bold hidden sm:block">
              <span className="text-primary">Shofz</span>
            </div>
          </Link>

          {/* Location (Desktop) */}
          {showLocation && (
            <button className="hidden md:flex items-center gap-1 hover:border border-white/20 p-2 rounded transition-all">
              <MapPin className="w-5 h-5" />
              <div className="text-left">
                <div className="text-xs text-gray-300">Find offers</div>
                <div className="text-sm font-semibold">Around You</div>
              </div>
            </button>
          )}

          {/* Search Bar */}
          {showSearch && (
            <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
              <div className="flex items-center bg-white rounded-md overflow-hidden shadow-sm">
                <Input
                  type="text"
                  placeholder="Search Shofz"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-500"
                />
                <Button
                  type="submit"
                  className="bg-[#733bc1] hover:bg-[#481eb2] text-[#131921] rounded-none h-full px-4"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            </form>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Account */}
            <Link
              to="/profile"
              className="hidden md:flex flex-col hover:border border-white/20 p-2 rounded transition-all"
            >
              <div className="text-xs text-gray-300">Hello, Sign in</div>
              <div className="text-sm font-semibold flex items-center gap-1">
                Account & Lists
              </div>
            </Link>

            {/* Cart */}
            {showCart && (
              <Link
                to="/inquiries"
                className="flex items-center gap-2 hover:border border-white/20 p-2 rounded transition-all relative"
              >
                <MessageCircleHeart className="w-6 h-6" />
                <span className="hidden md:block text-sm font-semibold">Inquiries</span>
                {/* Cart badge */}
                <span className="absolute top-0 right-0 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </Link>
            )}

          </div>
        </div>
      </div>

      {/* Secondary Navigation (Categories) */}
      <div className="bg-[#232f3e] px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <button className="flex items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline">
            <Menu className="w-4 h-4" />
            All
          </button>
          <Link to="/offers" className="text-sm font-medium whitespace-nowrap hover:underline">
            Today's Deals
          </Link>
          <Link to="/shops" className="text-sm font-medium whitespace-nowrap hover:underline">
            Shops
          </Link>
          <Link to="/products?category=Electronics" className="text-sm font-medium whitespace-nowrap hover:underline">
            Electronics
          </Link>
          <Link to="/products?category=Fashion" className="text-sm font-medium whitespace-nowrap hover:underline">
            Fashion
          </Link>
          <Link to="/products?category=Home" className="text-sm font-medium whitespace-nowrap hover:underline">
            Home & Garden
          </Link>
          <Link to="/products?category=Food" className="text-sm font-medium whitespace-nowrap hover:underline">
            Food & Beverage
          </Link>
        </div>
      </div>
    </header>
  );
}

// Simple header variant for detail pages
export function SimpleAmazonHeader({ title }: { title?: string }) {
  const navigate = useNavigate();

  return (
    <header className="bg-[#131921] text-white sticky top-0 z-50 shadow-md">
      <div className="px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          {title && (
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          )}
        </div>
      </div>
    </header>
  );
}
