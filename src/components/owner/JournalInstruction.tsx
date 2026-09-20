import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Instruction = {
  title?: string;
  intro?: string[];
  rules?: string[];
  before_writing?: string[];
  commands?: string[];
};

const Block = ({ title, items, ordered }: { title: string; items?: string[]; ordered?: boolean }) =>
  !items?.length ? null : (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-slate-300">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="text-sm leading-relaxed text-slate-400">
            {ordered ? `${i + 1}. ` : '· '}
            {t}
          </li>
        ))}
      </ul>
    </div>
  );

const JournalInstruction = ({ data }: { data?: Instruction }) => {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Icon name="BookOpen" className="text-amber-400" size={16} />
        <span className="font-medium text-amber-300">{data.title ?? 'Как вести журнал'}</span>
        <Icon
          name="ChevronDown"
          size={16}
          className={`ml-auto text-amber-400/70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-amber-500/20 px-4 pb-4 pt-3">
          {data.intro?.map((p, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-slate-400">
              {p}
            </p>
          ))}
          <Block title="Правила записи" items={data.rules} ordered />
          <Block title="Перед записью проверить" items={data.before_writing} />
          <Block title="Команды владельца" items={data.commands} />
        </div>
      )}
    </div>
  );
};

export default JournalInstruction;
