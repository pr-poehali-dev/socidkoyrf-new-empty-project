import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';

type Props = {
  title: string;
  icon: string;
  planned: string[];
};

const Stub = ({ title, icon, planned }: Props) => (
  <OwnerLayout>
    <div className="mb-5">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-500">Раздел в работе</p>
    </div>
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
      <Icon name={icon} className="mx-auto mb-3 text-slate-600" size={32} />
      <p className="text-sm text-slate-400">Здесь появится:</p>
      <ul className="mt-3 space-y-1 text-sm text-slate-500">
        {planned.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
    </div>
  </OwnerLayout>
);

export default Stub;
