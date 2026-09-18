import { OUT, POSITIONS, type Game, type Player, type Position } from '../types';
import { positionOf } from '../lib/fairness';

interface Props {
  game: Game;
  players: Player[];
  currentInning: number;
  onSelectInning: (inning: number) => void;
  onSetCell: (inning: number, playerId: string, value: Position | 'OUT') => void;
}

/**
 * The whole game at a glance — the same shape as the exported PDF, so what the
 * coach approves on screen is what prints.
 */
export function LineupGrid({
  game,
  players,
  currentInning,
  onSelectInning,
  onSetCell,
}: Props) {
  const ordered = game.battingOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  return (
    <div className="gridwrap">
      <table className="grid">
        <thead>
          <tr>
            <th className="grid__th grid__th--order" scope="col">
              #
            </th>
            <th className="grid__th grid__th--name" scope="col">
              Name
            </th>
            <th className="grid__th grid__th--num" scope="col">
              Uni
            </th>
            {Array.from({ length: game.innings }).map((_, i) => (
              <th
                key={i}
                scope="col"
                className={`grid__th grid__th--inn ${
                  i === currentInning ? 'is-current' : ''
                }`}
                onClick={() => onSelectInning(i)}
              >
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((p, row) => (
            <tr key={p.id}>
              <td className="grid__td grid__td--order">{row + 1}</td>
              <td className="grid__td grid__td--name">{p.name}</td>
              <td className="grid__td grid__td--num">{p.uniform || ''}</td>
              {Array.from({ length: game.innings }).map((_, i) => {
                const pos = positionOf(game, i, p.id);
                const isOut = pos === null;
                return (
                  <td
                    key={i}
                    className={`grid__td grid__td--cell ${isOut ? 'is-out' : ''} ${
                      i === currentInning ? 'is-current' : ''
                    }`}
                  >
                    <select
                      className="grid__select"
                      aria-label={`${p.name}, inning ${i + 1}`}
                      value={pos ?? OUT}
                      onChange={(e) =>
                        onSetCell(i, p.id, e.target.value as Position | 'OUT')
                      }
                    >
                      <option value={OUT}>{OUT}</option>
                      {POSITIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {ordered.length === 0 && (
        <div className="empty">Add players to the roster first.</div>
      )}
    </div>
  );
}
