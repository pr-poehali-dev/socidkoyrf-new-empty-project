import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

type Props = {
  fileName: string;
  headerRow: string[];
  sample: string[][];
  totalRows: number;
  onPick: (file: File) => void;
  error: string;
};

const StepFile = ({
  fileName,
  headerRow,
  sample,
  totalRows,
  onPick,
  error,
}: Props) => {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-400">Файл прайса</Label>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
        <button
          onClick={() => input.current?.click()}
          className="mt-1 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900 px-4 py-8"
        >
          <Icon name="FileSpreadsheet" size={28} className="text-slate-500" />
          <span className="text-sm text-slate-400">
            {fileName || 'Выбрать Excel или CSV'}
          </span>
          {totalRows > 0 && (
            <span className="text-xs text-slate-500">строк с товаром: {totalRows}</span>
          )}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {headerRow.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="mb-2 text-xs text-slate-500">Первые строки файла</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  {headerRow.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-2 py-1 text-left font-medium">
                      {h || `колонка ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-500">
                {sample.map((row, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    {headerRow.map((_, j) => (
                      <td key={j} className="max-w-[10rem] truncate px-2 py-1">
                        {row[j] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {headerRow.length > 0 && (
        <Button
          variant="ghost"
          className="h-10 w-full text-slate-400"
          onClick={() => input.current?.click()}
        >
          Выбрать другой файл
        </Button>
      )}
    </div>
  );
};

export default StepFile;
