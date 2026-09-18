import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { RosterView } from './views/RosterView';
import { LineupView } from './views/LineupView';
import { GamesView } from './views/GamesView';
import { useAppStore } from './store/useAppStore';
import { IconGames, IconLineup, IconRoster } from './components/Icons';

type Tab = 'lineup' | 'games' | 'roster';

const TABS: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: 'lineup', label: 'Lineup', Icon: IconLineup },
  { id: 'games', label: 'Games', Icon: IconGames },
  { id: 'roster', label: 'Roster', Icon: IconRoster },
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
            <span className="tabbar__icon">
              <t.Icon />
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
