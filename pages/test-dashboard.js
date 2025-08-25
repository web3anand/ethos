// Test page for new dashboard features
import { useState, useEffect } from 'react';
import InvitationStats from '../components/InvitationStats';
import TopMembers from '../components/TopMembers';
import XpDistribution from '../components/XpDistribution';

export default function TestDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // Sample userkey for testing
  const testUserkey = "0x742d35Cc6634C0532925a3b8D00A0BF7";

  return (
    <div style={{ 
      padding: '20px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>
        Ethos Network Dashboard Features Test
      </h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div>
          <h2>Invitation Statistics</h2>
          <InvitationStats userkey={testUserkey} />
        </div>
        
        <div>
          <h2>Top Members</h2>
          <TopMembers limit={8} />
        </div>
        
        <div>
          <h2>XP Distribution</h2>
          <XpDistribution userkey={testUserkey} />
        </div>
      </div>
    </div>
  );
}
