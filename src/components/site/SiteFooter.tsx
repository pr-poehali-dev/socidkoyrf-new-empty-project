import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const SiteFooter = () => (
  <footer className="border-t bg-muted/30">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon name="Tag" size={16} className="text-primary" />
        СоСкидкой.РФ
      </div>
      <nav className="flex gap-4 text-sm text-muted-foreground sm:ml-auto">
        <Link to="/privacy" className="transition-colors hover:text-foreground">
          Политика конфиденциальности
        </Link>
        <Link to="/login" className="transition-colors hover:text-foreground">
          Войти
        </Link>
      </nav>
      <span className="text-xs text-muted-foreground sm:ml-4">
        {new Date().getFullYear()}
      </span>
    </div>
  </footer>
);

export default SiteFooter;