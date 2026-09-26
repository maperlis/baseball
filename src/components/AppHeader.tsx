interface Props {
  teamName: string;
  subtitle?: string;
}

export function AppHeader({ teamName, subtitle }: Props) {
  return (
    <header className="header">
      <img className="header__logo" src="/logo.png" alt="" />
      <div className="header__titles">
        <div className="header__team">{teamName || 'Westwood'}</div>
        {subtitle && <div className="header__sub">{subtitle}</div>}
      </div>
      <a className="header__play" href="/game">
        Play ⚾
      </a>
    </header>
  );
}
