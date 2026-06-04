import { useState } from 'react';
import HomePage from './pages/HomePage';
import FaskesPage from './pages/FaskesPage';
import CommandPage from './pages/CommandPage';
import LiteracyPage from './pages/LiteracyPage';

type Sector = 'home' | 'faskes' | 'command' | 'literacy';

export default function App() {
  const [sector, setSector] = useState<Sector>('home');

  const navigate = (s: string) => setSector(s as Sector);

  switch (sector) {
    case 'faskes':
      return <FaskesPage onNavigate={navigate} />;
    case 'command':
      return <CommandPage onNavigate={navigate} />;
    case 'literacy':
      return <LiteracyPage onNavigate={navigate} />;
    default:
      return <HomePage onNavigate={navigate} />;
  }
}
