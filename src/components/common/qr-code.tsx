// src/components/common/qr-code.tsx
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';

interface QrCodeProps {
  value: string;
  // Width and height in points, including the quiet zone
  size: number;
  color?: string;
  backgroundColor?: string;
}

// White border the scanner needs around the code, in modules
const QUIET_ZONE = 2;

/**
 * QR code drawn with plain Views (one row of dark runs per line), so it needs no
 * native SVG module and works offline.
 */
export function QrCode({ value, size, color = '#000', backgroundColor = '#fff' }: QrCodeProps) {
  const rows = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();

    // Collapse each row into runs of dark modules to keep the view count low
    const result: { start: number; length: number }[][] = [];
    for (let row = 0; row < count; row++) {
      const runs: { start: number; length: number }[] = [];
      let col = 0;
      while (col < count) {
        if (qr.isDark(row, col)) {
          const start = col;
          while (col < count && qr.isDark(row, col)) col++;
          runs.push({ start, length: col - start });
        } else {
          col++;
        }
      }
      result.push(runs);
    }
    return { count, rows: result };
  }, [value]);

  const cell = size / (rows.count + QUIET_ZONE * 2);

  return (
    <View style={{ width: size, height: size, backgroundColor, padding: cell * QUIET_ZONE }}>
      {rows.rows.map((runs, rowIndex) => (
        <View key={rowIndex} style={{ height: cell, flexDirection: 'row' }}>
          {runs.map((run) => (
            <View
              key={run.start}
              style={{ position: 'absolute', left: run.start * cell, width: run.length * cell, height: cell, backgroundColor: color }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
