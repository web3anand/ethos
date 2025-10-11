import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Custom404() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))' 
    }}>
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '1rem', 
            boxShadow: 'var(--shadow-lg)', 
            padding: '3rem' 
          }}>
            <div className="text-6xl mb-8">🔍</div>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: 'bold', 
              color: 'var(--text-primary)', 
              marginBottom: '1rem' 
            }}>
              Page Not Found
            </h1>
            <p style={{ 
              fontSize: '1.125rem', 
              color: 'var(--text-secondary)', 
              marginBottom: '2rem' 
            }}>
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
            <div className="space-y-4">
              <Link 
                href="/"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                  color: 'var(--text-primary)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                Go Home
              </Link>
              <div style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-muted)' 
              }}>
                Or try searching for a user profile above
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
