import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { RosterView } from './views/RosterView';
import { LineupView } from './views/LineupView';
import { GamesView } from './views/GamesView';
import { useAppStore } from './store/useAppStore';

type Tab = 'lineup' | 'games' | 'roster';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'lineup', label: 'Lineup', icon: '⚾' },
  { id: 'games', label: 'Games', icon: '🗓' },
  { id: 'roster', label: 'Roster', icon: '👥' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('lineup');
  const teamName = useAppStore((s) => s.teamName);
  const games = useAppStore((s) => s.games);
  const activeGameId = useAppStore((s) => s.activeGameId);
  const active = games.find((g) => g.id === activeGameId) ?? games[0] ?? null;

  return (
    <div className="app">
      <AppHeader
        teamName={teamName}
        subtitle={active ? `${active.name} · ${active.date}` : 'No game selected'}
      />

      <main className="app__main">
        {tab === 'lineup' && <LineupView onGoToGames={() => setTab('games')} />}
        {tab === 'games' && <GamesView onOpenLineup={() => setTab('lineup')} />}
        {tab === 'roster' && <RosterView />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tabbar__btn"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="tabbar__icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
