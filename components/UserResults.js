export default function UserResults({ data }) {
  if (!data || !data.user) return null;
  const user = data.user;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
      {/* Column 1: Reputation Signals */}
      <div className="bg-white shadow p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Reputation Signals</h2>
        {user.reputationSignals && user.reputationSignals.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {user.reputationSignals.map((signal, idx) => (
              <li key={idx}>{signal}</li>
            ))}
          </ul>
        ) : (
          <p>No on-chain reputation feedback.</p>
        )}
      </div>

      {/* Column 2: Credibility Scoring System */}
      <div className="bg-white shadow p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Credibility</h2>
        <p>
          <span className="font-medium">Username:</span> {user.username}
        </p>
        <p>
          <span className="font-medium">Score:</span> {user.score}
        </p>
        <p>
          <span className="font-medium">Status:</span> {user.status}
        </p>
      </div>

      {/* Column 3: Universally Visible Data */}
      <div className="bg-white shadow p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Public Data</h2>
        <p>
          <span className="font-medium">Followers:</span> {user.followers}
        </p>
        <p>
          <span className="font-medium">
            


             
             
        </p>
        {user.other && (
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(user.other, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
