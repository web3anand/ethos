import { useRouter } from 'next/router';
import { useEffect } from 'react';

const LockedPage = ({ children, pageName }) => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if trying to access locked pages
    if (router.pathname !== '/') {
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Benzin, sans-serif', letterSpacing: '0.05em' }}>
            Page Locked 🔒
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            {pageName} is currently under development and not accessible.
          </p>
          <p className="text-gray-400 mb-8">
            Please check back later or return to the home page.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Return to Home
          </button>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-3">Coming Soon</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">R4R Checker</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Data Center</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Distribution</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">HOT News</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">About</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Leaderboard</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Analytics</span>
              <span className="text-yellow-400">🔒 Locked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedPage;
