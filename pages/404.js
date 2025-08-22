import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="text-6xl mb-8">🔍</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-lg text-gray-600 mb-8">
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
            <div className="space-y-4">
              <Link 
                href="/"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Go Home
              </Link>
              <div className="text-sm text-gray-500">
                Or try searching for a user profile above
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
