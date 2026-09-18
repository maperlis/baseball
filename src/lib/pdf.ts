import { jsPDF } from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { OUT, type Game, type Player } from '../types';
import { formatLongDate } from './ids';
import { positionOf } from './fairness';

/**
 * Colours lifted from the sample lineup card. Deliberately NOT the Westwood
 * palette — the printed card stays neutral so position letters and the OUT
 * shading carry all the meaning.
 */
const HEADER_FILL: [number, number, number] = [63, 63, 63];
const ZEBRA_FILL: [number, number, number] = [247, 247, 247];
const OUT_FILL: [number, number, number] = [191, 191, 191];
const LINE: [number, number, number] = [208, 208, 208];
const FOOTER_FILL: [number, number, number] = [242, 242, 242];

export function buildLineupPdf(teamName: string, game: Game, players: Player[]): jsPDF {
  const ordered = game.battingOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  // Past about 8 innings the columns get too tight for portrait.
  const landscape = game.innings > 8;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(teamName || 'Lineup', margin, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text(formatLongDate(game.date), pageW - margin, 52, { align: 'right' });

  // Widths are derived from the page, not hardcoded, so the table fills the
  // margins exactly at any inning count instead of overflowing.
  const usable = pageW - margin * 2;
  const orderW = 80;
  const uniformW = 58;
  const minNameW = landscape ? 110 : 84;
  const innWidth = Math.min(
    54,
    (usable - orderW - uniformW - minNameW) / game.innings,
  );
  const nameW = usable - orderW - uniformW - innWidth * game.innings;

  // "1 Inning" needs about 50pt. Below that, drop to a bare number rather than
  // letting the header wrap onto two lines.
  const innHeader = (i: number) =>
    innWidth >= 50 ? `${i + 1} Inning` : `${i + 1}`;

  const head = [
    [
      'Batting Order',
      'Name',
      'Uniform #',
      ...Array.from({ length: game.innings }, (_, i) => innHeader(i)),
    ],
  ];

  const body = ordered.map((p, row) => [
    String(row + 1),
    p.name,
    p.uniform || '',
    ...Array.from({ length: game.innings }, (_, i) => positionOf(game, i, p.id) ?? OUT),
  ]);

  const columnStyles: Record<number, { cellWidth: number }> = {
    0: { cellWidth: orderW },
    1: { cellWidth: nameW },
    2: { cellWidth: uniformW },
  };
  for (let i = 0; i < game.innings; i++) {
    columnStyles[i + 3] = { cellWidth: innWidth };
  }

  autoTable(doc, {
    head,
    body,
    startY: 72,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 7,
      halign: 'center',
      valign: 'middle',
      lineColor: LINE,
      lineWidth: 0.5,
      textColor: 40,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: { top: 6, bottom: 6, left: 2, right: 2 },
    },
    alternateRowStyles: { fillColor: ZEBRA_FILL },
    columnStyles,
    didParseCell: (data: CellHookData) => {
      // Shade benched innings so they're impossible to miss on paper.
      if (data.section === 'body' && data.column.index >= 3) {
        const text = Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text;
        if (text === OUT) {
          data.cell.styles.fillColor = OUT_FILL;
          data.cell.styles.textColor = 40;
        }
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;

  doc.setFillColor(...FOOTER_FILL);
  doc.rect(margin, finalY + 14, pageW - margin * 2, 26, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${game.name} · Created with Westwood Lineup`,
    pageW / 2,
    finalY + 31,
    { align: 'center' },
  );

  return doc;
}

export function exportLineupPdf(teamName: string, game: Game, players: Player[]): void {
  const doc = buildLineupPdf(teamName, game, players);
  const slug = (s: string) => s.trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  doc.save(`${slug(teamName) || 'lineup'}-${game.date}.pdf`);
}
