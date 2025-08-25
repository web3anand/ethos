import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import EthosLogo from './EthosLogo'; // Assuming you have an EthosLogo component

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/r4r-checker', label: 'R4R Checker' },
    { href: '/data-center', label: 'Data Center' },
    { href: '/distribution', label: 'Distribution' },
    { href: '/hot-news', label: 'Hot News' },
    { href: '/about', label: 'About' },
  ];

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(`${href}-new`);

  return (
    <div className="w-full flex justify-center p-4">
      <nav className="w-full max-w-6xl flex items-center justify-center bg-gray-900/50 backdrop-blur-lg rounded-2xl p-3 border border-gray-700/50 shadow-2xl">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                isActive(item.href)
                  ? 'bg-blue-600/40 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-300 hover:text-white focus:outline-none p-2 rounded-lg hover:bg-gray-700/50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m4 6h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-24 left-4 right-4 z-50">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all duration-300 ${
                  isActive(item.href)
                    ? 'bg-blue-600/40 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
