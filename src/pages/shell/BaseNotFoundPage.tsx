import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@solvera/pace-core/components';

export function BaseNotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <section className="grid min-h-[50vh] place-items-center gap-4 py-8">
      <h1>Page not found</h1>
      <p>
        The path <code>{location.pathname}</code> does not exist in BASE.
      </p>
      <Button variant="default" type="button" onClick={() => navigate('/')}>
        Back to events
      </Button>
    </section>
  );
}
