import { useState } from 'react';
import { Search, MessageCircleHeart, MapPin, Menu, User, Bell, Heart, ShoppingBag } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useIsMobile } from '@/hooks/use-mobile';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import SearchBar from '@/components/SearchBar';

export function HomeHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollDirection = useScrollDirection();
  const isMobile = useIsMobile();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isHidden = isMobile && scrollDirection === 'down';

  return (
    <header
      className="bg-gray-900 text-white sticky top-0 z-50 shadow-md transition-transform duration-300"
      style={{
        transform: isHidden ? 'translateY(-100%)' : 'translateY(0)'
      }}
    >
      {/* Main Header */}
      <div className="px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <img
              src="/shofz-logo.png"
              alt="Shofz Logo"
              className="h-10 w-10"
            />
            <div className="text-xl font-bold hidden sm:block">
              <span className="text-white">Shofz</span>
            </div>
          </Link>

          {/* Location (Desktop) */}
          <button className="hidden lg:flex items-center gap-1 hover:border border-white/20 p-2 rounded transition-all flex-shrink-0">
            <div className="text-left max-w-[220px]">
              <div className="text-xs text-gray-300">Find Offers, Products,</div>
              <div className="text-xs text-gray-300">Shops, and More Around You</div>
            </div>
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-4xl">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Search Shofz"
              showDropdown={true}
              className="w-full"
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">

            {/* Favorites (Desktop) */}
            <Link
              to="/favorites"
              className="hidden md:flex items-center gap-2 hover:border border-white/20 px-2 py-2 rounded transition-all"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Install PWA Button */}
            <InstallPWAButton />

            {/* Inquiries/Cart */}
            <Link
              to="/inquiries"
              className="flex items-center gap-2 hover:border border-white/20 px-2 py-2 rounded transition-all relative"
            >
              <MessageCircleHeart className="w-6 h-6" />
              <span className="hidden lg:block text-sm font-semibold">Inquiries</span>
            </Link>
            {/* Badge 
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                0
              </Badge>*/}
            {/* Account (Desktop) */}
            <Link
              to="/profile"
              className="hidden md:flex flex-col hover:border border-white/20 px-2 rounded transition-all"
            >
              <div className="text-xs text-gray-300">Hello, {user?.name || 'Sign in'}</div>
              <div className="text-sm font-semibold">Account</div>

            </Link>

          </div>
        </div>
      </div>

      {/* Secondary Navigation (Categories) */}
      <div className="bg-primary px-4 py-1.5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-start md:justify-center gap-6 overflow-x-auto scrollbar-hide">
          <button className="flex items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline">
            <ShoppingBag className="w-4 h-4" />
            <Link to="/products" className="text-sm font-medium whitespace-nowrap hover:underline">
              Products
            </Link>
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
