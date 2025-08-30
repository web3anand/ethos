import '../styles/globals.css';
import dynamic from 'next/dynamic';

// Dynamically import EthosConnectProvider to avoid SSR issues
const EthosConnectProvider = dynamic(
  () => import('ethos-connect').then(mod => mod.EthosConnectProvider),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  return (
    <EthosConnectProvider>
      <div className="glass-bg" />
      <Component {...pageProps} />
    </EthosConnectProvider>
  );
}
