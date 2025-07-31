import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <Link href="/">
        <span className="font-bold text-xl">Ethos</span>
      </Link>
      <a
        href="https://ethos.network/"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600"
      >
        Open Ethos Network
      </a>
    </nav>
  );
}
