import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// The game is its own chunk: the lineup app never downloads it.
const GameApp = lazy(() => import('./game/GameApp'));
const isGame = window.location.pathname.startsWith('/game');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isGame ? (
      <Suspense fallback={null}>
        <GameApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
