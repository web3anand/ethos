import { useRouter } from 'next/router';
import Navbar from './Navbar'; // Import the Navbar
import EthosLogo from './EthosLogo'; // Import the EthosLogo for a consistent icon

const LockedPage = ({ pageName }) => {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="max-w-lg mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(88, 166, 255, 0.1)', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Page Locked
            </h1>
            <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
              The page "{pageName}" is currently under construction.
            </p>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
              This feature will be available in a future update. Please check back later.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 border"
              style={{
                background: 'rgba(88, 166, 255, 0.4)',
                color: 'var(--text-primary)',
                borderColor: 'rgba(88, 166, 255, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(88, 166, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(88, 166, 255, 0.4)';
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LockedPage;
