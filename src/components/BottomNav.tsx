import { Home, Search, Store, User, Tag, Heart } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useIsMobile } from "@/hooks/use-mobile";

const publicNavItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/products", icon: Search, label: "Products" },
  { path: "/shops", icon: Store, label: "Shops" },
  { path: "/offers", icon: Tag, label: "Offers" },
  { path: "/favorites", icon: Heart, label: "Favorites" },
];

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const scrollDirection = useScrollDirection();
  const isMobile = useIsMobile();

  // Hide BottomNav on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  const navItems = [
    ...publicNavItems,
    {
      path: isAuthenticated ? "/profile" : "/auth",
      icon: User,
      label: isAuthenticated ? "You" : "Sign In"
    }
  ];

  const isHidden = isMobile && scrollDirection === 'down';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden transition-transform duration-300"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        transform: isHidden ? 'translateY(100%)' : 'translateY(0)'
      }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 relative touch-target transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                {/* Icon */}
                <div className="relative mb-1">
                  <Icon
                    className={`w-6 h-6 transition-all ${
                      isActive ? 'stroke-[2.5]' : 'stroke-[2]'
                    }`}
                  />
                  {/* Active Indicator - Amazon style orange dot */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] font-medium transition-all ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
