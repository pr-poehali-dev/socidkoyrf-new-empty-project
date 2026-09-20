import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

const SiteHeader = () => {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="Tag" size={18} />
          </span>
          <span>СоСкидкой.РФ</span>
        </Link>

        <div className="ml-auto">
          {loading ? null : user ? (
            <Link to="/account" className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;