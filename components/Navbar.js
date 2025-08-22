import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', locked: false },
    { href: '/r4r-checker', label: 'R4R Checker', locked: true },
    { href: '/data-center', label: 'Data Center', locked: true },
    { href: '/distribution', label: 'Distribution', locked: true },
    { href: '/hot-news', label: 'HOT', hot: true, locked: true },
    { href: '/about', label: 'About', locked: true },
  ];

  const isActive = (href) => router.pathname === href;

  return (
    <div className="w-full flex justify-center pt-3 pb-1 px-2 md:pt-4 md:pb-2 md:px-4">
      {/* Main Navigation Pill */}
      <nav className="relative bg-black/20 backdrop-blur-xl rounded-lg px-3 py-1 md:px-6 md:py-1.5 shadow-2xl border border-gray-800/30 transition-all duration-500 hover:bg-black/30 hover:border-gray-700/40 min-w-fit w-full max-w-sm md:max-w-none md:w-auto">
        {/* Glass overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/40 via-gray-800/40 to-gray-900/40 rounded-lg opacity-60 transition-opacity duration-500 hover:opacity-80"></div>
        
        {/* Navigation Items Container */}
        <div className="relative flex items-center justify-between md:justify-center md:space-x-2">
          {/* Mobile: Only show Home and Menu button */}
          <div className="flex md:hidden items-center w-full justify-between">
            <Link
              href="/"
              className={`relative px-2.5 py-1 rounded-md text-sm font-medium transition-all duration-300 group mobile-nav-button ${
                isActive('/')
                  ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm border border-white/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="relative z-10">Home</span>
            </Link>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative text-gray-300 hover:text-white focus:outline-none focus:text-white p-1 rounded-md hover:bg-white/10 transition-all duration-300 group mobile-nav-button"
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-600/20 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <svg className="relative z-10 h-4 w-4 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop: Show all navigation items */}
          <div className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => (
              item.locked ? (
                <div
                  key={item.href}
                  className="relative px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                >
                  <span className="relative z-10 flex items-center space-x-1 text-gray-500">
                    <span>{item.label}</span>
                    {item.hot && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-sm text-xs font-bold bg-gray-600 text-gray-400">
                        🔒
                      </span>
                    )}
                    {!item.hot && (
                      <span className="text-xs">🔒</span>
                    )}
                  </span>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1 rounded-md text-sm font-medium transition-all duration-300 group ${
                    isActive(item.href)
                      ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm border border-white/20'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {/* Smooth background transition */}
                  <div className={`absolute inset-0 rounded-md transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-gray-700/30 via-gray-600/30 to-gray-700/30 opacity-100'
                      : 'bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-600/20 opacity-0 group-hover:opacity-100'
                  }`}></div>
                  
                  <span className="relative z-10 flex items-center space-x-1">
                    <span>{item.label}</span>
                    {item.hot && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-sm text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-sm">
                        🔥
                      </span>
                    )}
                  </span>
                </Link>
              )
            ))}
          </div>

          {/* Mobile menu button - moved to mobile section above */}
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-12 left-2 right-2 md:top-14 md:left-4 md:right-4 md:hidden z-50 transition-all duration-300 animate-in slide-in-from-top-5">
          <div className="relative bg-black/30 backdrop-blur-xl rounded-lg shadow-2xl border border-gray-800/40 overflow-hidden">
            {/* Glass overlay for mobile menu */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 opacity-75"></div>
            
            <div className="relative p-1.5 space-y-0.5">
              {navItems.filter(item => item.href !== '/').map((item) => (
                item.locked ? (
                  <div
                    key={item.href}
                    className="relative block px-2.5 py-2 rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                  >
                    <span className="relative z-10 flex items-center justify-between text-gray-500">
                      <span>{item.label}</span>
                      {item.hot ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-bold bg-gray-600 text-gray-400">
                          🔒 LOCKED
                        </span>
                      ) : (
                        <span className="text-xs">🔒</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`relative block px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-300 group ${
                      isActive(item.href)
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {/* Smooth background transition for mobile */}
                    <div className={`absolute inset-0 rounded-md transition-all duration-300 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-gray-700/30 via-gray-600/30 to-gray-700/30 opacity-100'
                        : 'bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-600/20 opacity-0 group-hover:opacity-100'
                    }`}></div>
                    
                    <span className="relative z-10 flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.hot && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-sm">
                          🔥 HOT
                        </span>
                      )}
                    </span>
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
