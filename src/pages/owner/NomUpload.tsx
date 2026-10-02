import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import OwnerLayout from '@/components/owner/OwnerLayout';
import StepFile from '@/components/owner/upload/StepFile';
import StepMapping, { Mapping } from '@/components/owner/upload/StepMapping';
import StepPreview from '@/components/owner/upload/StepPreview';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  analyzeRows,
  commitRows,
  fetchUploadHistory,
  finishUpload,
  startUpload,
  Alphabet,
  ParsedRow,
  RawRow,
  UploadHistory,
} from '@/lib/nomUpload';

const steps = ['Файл', 'Колонки', 'Разбор', 'Проверка', 'Запись'];

const emptyMapping: Mapping = {
  name: '',
  article: '',
  brand: '',
  group: '',
  weight: '',
  volume: '',
};

const guess = (header: string[]): Mapping => {
  const find = (words: string[]) => {
    const i = header.findIndex((h) =>
      words.some((w) => h.toLowerCase().includes(w)),
    );
    return i >= 0 ? String(i) : '';
  };
  return {
    name: find(['наимен', 'назван', 'товар', 'name']),
    article: find(['артикул', 'код', 'sku', 'article']),
    brand: find(['бренд', 'марка', 'производ', 'brand']),
    group: find(['группа', 'категор', 'раздел', 'тип']),
    weight: find(['вес', 'масса', 'weight']),
    volume: find(['объ', 'volume']),
  };
};

const NomUpload = () => {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [alphaName, setAlphaName] = useState<Alphabet>('none');
  const [alphaArticle, setAlphaArticle] = useState<Alphabet>('none');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [history, setHistory] = useState<UploadHistory[]>([]);

  useEffect(() => {
    fetchUploadHistory().then(setHistory);
  }, []);

  const pickFile = async (file: File) => {
    setError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });
      const rows = grid.filter((r) => r.some((c) => String(c).trim()));
      if (rows.length < 2) {
        setError('В файле не нашлось строк с товаром');
        return;
      }
      const head = rows[0].map((c) => String(c).trim());
      setFileName(file.name);
      setHeader(head);
      setAllRows(rows.slice(1));
      setMapping(guess(head));
    } catch {
      setError('Не получилось прочитать файл. Нужен Excel или CSV');
    }
  };

  const runAnalyze = async () => {
    setBusy(true);
    setError('');
    try {
      const col = (key: keyof Mapping) =>
        mapping[key] === '' ? undefined : Number(mapping[key]);
      const raw: RawRow[] = allRows.map((r, i) => ({
        row: i + 1,
        name: col('name') !== undefined ? r[col('name')!] : '',
        article: col('article') !== undefined ? r[col('article')!] : '',
        brand: col('brand') !== undefined ? r[col('brand')!] : '',
        group: col('group') !== undefined ? r[col('group')!] : '',
        weight: col('weight') !== undefined ? r[col('weight')!] : '',
        volume: col('volume') !== undefined ? r[col('volume')!] : '',
      }));
      const chunks: ParsedRow[] = [];
      for (let i = 0; i < raw.length; i += 200) {
        const part = await analyzeRows(raw.slice(i, i + 200), alphaName, alphaArticle);
        chunks.push(...part);
      }
      setParsed(chunks);
      setStep(3);
    } catch {
      setError('Не удалось разобрать строки');
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    setBusy(true);
    setError('');
    try {
      const uploadId = await startUpload({
        file_name: fileName,
        rows_total: parsed.length,
        mapping: mapping as unknown as Record<string, string>,
      });
      const total = { created: 0, updated: 0, skipped: 0 };
      for (let i = 0; i < parsed.length; i += 100) {
        const part = await commitRows({
          upload_id: uploadId,
          rows: parsed.slice(i, i + 100),
        });
        total.created += part.created;
        total.updated += part.updated;
        total.skipped += part.skipped;
      }
      await finishUpload(uploadId);
      setResult(total);
      setStep(4);
      fetchUploadHistory().then(setHistory);
    } catch {
      setError('Не удалось записать');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setFileName('');
    setHeader([]);
    setAllRows([]);
    setMapping(emptyMapping);
    setParsed([]);
    setResult(null);
    setError('');
  };

  const canNext =
    (step === 0 && header.length > 0) ||
    (step === 1 && mapping.name !== '') ||
    step === 2 ||
    (step === 3 && parsed.some((r) => !r.skip));

  return (
    <OwnerLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Icon name="Upload" size={20} className="text-primary" />
              Загрузка прайса
            </h1>
            <p className="text-sm text-slate-500">Шаг {step + 1} из 5 · {steps[step]}</p>
          </div>
          <Link
            to="/owner/nomenclature"
            className="shrink-0 text-sm text-slate-400 hover:text-slate-200"
          >
            К справочнику
          </Link>
        </div>

        <div className="flex gap-1">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? 'bg-primary' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <StepFile
            fileName={fileName}
            headerRow={header}
            sample={allRows.slice(0, 5)}
            totalRows={allRows.length}
            onPick={pickFile}
            error={error}
          />
        )}

        {step === 1 && (
          <StepMapping
            headerRow={header}
            mapping={mapping}
            setMapping={setMapping}
            alphaName={alphaName}
            setAlphaName={setAlphaName}
            alphaArticle={alphaArticle}
            setAlphaArticle={setAlphaArticle}
          />
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm leading-relaxed text-slate-400">
              Сейчас перепишем буквы-двойники, уберём лишние пробелы и невидимые знаки,
              разберём каждое наименование на группу, бренд, модель и признаки, а потом
              сличим с тем, что уже есть в справочнике.
            </p>
            <p className="text-xs text-slate-500">Строк в работе: {allRows.length}</p>
            <Button className="h-11 w-full" onClick={runAnalyze} disabled={busy}>
              {busy ? 'Разбираю…' : 'Разобрать'}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === 3 && <StepPreview rows={parsed} setRows={setParsed} />}

        {step === 4 && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
              <Icon name="CircleCheck" size={32} className="mx-auto mb-2 text-emerald-400" />
              <p className="font-medium">Загрузка завершена</p>
              <p className="mt-2 text-sm text-slate-400">
                Создано {result.created} · дополнено {result.updated} · пропущено{' '}
                {result.skipped}
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="h-11 flex-1" onClick={reset}>
                Загрузить ещё
              </Button>
              <Link to="/owner/nomenclature" className="flex-1">
                <Button variant="secondary" className="h-11 w-full">
                  В справочник
                </Button>
              </Link>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                className="h-11 text-slate-400"
                onClick={() => setStep(step - 1)}
                disabled={busy}
              >
                <Icon name="ChevronLeft" size={18} className="mr-1" />
                Назад
              </Button>
            )}
            {step < 3 && (
              <Button
                className="h-11 flex-1"
                onClick={() => setStep(step + 1)}
                disabled={!canNext || busy}
              >
                Дальше
                <Icon name="ChevronRight" size={18} className="ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button className="h-11 flex-1" onClick={runCommit} disabled={!canNext || busy}>
                {busy ? 'Записываю…' : 'Записать в справочник'}
              </Button>
            )}
          </div>
        )}

        {step === 0 && history.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-400">История загрузок</h2>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5"
                >
                  <p className="truncate text-sm">
                    {h.file_name || 'Без имени'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(h.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · создано {h.created} · дополнено {h.updated} · пропущено {h.skipped}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default NomUpload;
