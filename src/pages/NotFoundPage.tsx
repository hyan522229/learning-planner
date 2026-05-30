import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-muted-foreground mb-6">页面未找到</p>
      <Button asChild>
        <Link to="/">返回仪表盘</Link>
      </Button>
    </div>
  );
}
