import { useRouter } from 'next/router';
import Navbar from './Navbar'; // Import the Navbar
import EthosLogo from './EthosLogo'; // Import the EthosLogo for a consistent icon

const LockedPage = ({ pageName }) => {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ background: 'var(--background-color)', color: 'var(--text-primary)' }}>
        <div className="max-w-lg mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Page Locked
            </h1>
            <p className="text-lg text-gray-400 mb-6">
              The page "{pageName}" is currently under construction.
            </p>
            <p className="text-gray-500 mb-8">
              This feature will be available in a future update. Please check back later.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600/40 text-blue-100 rounded-lg font-semibold hover:bg-blue-600/60 transition-all duration-200 border border-blue-500/50"
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
