import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/distribution', label: 'Distribution' },
    { href: '/about', label: 'About' },
  ];

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(`${href}-new`);

  return (
    <div className={styles.navbarContainer}>
      <nav className={styles.navbar}>
        {/* Desktop Navigation */}
        <div className={styles.desktopNav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className={styles.mobileMenuButton}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={styles.menuButton}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className={styles.mobileDropdown}>
          <div className={styles.dropdownContent}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`${styles.mobileNavLink} ${isActive(item.href) ? styles.active : ''}`}
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
