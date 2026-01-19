import React from 'react';
import { Home, PlayCircle, PlusCircle, ShoppingBag, User as UserIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user?: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: PlayCircle, label: 'Earn', path: '/earn' },
    { icon: PlusCircle, label: 'Promote', path: '/promote' },
    { icon: ShoppingBag, label: 'Buy', path: '/store' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      {/* Coin Pill Overlay */}
      {user && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md z-50 pointer-events-none">
              {user.coins} Coins
          </div>
      )}

      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive(item.path) ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <item.icon size={24} strokeWidth={isActive(item.path) ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;