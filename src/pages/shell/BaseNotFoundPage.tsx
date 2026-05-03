import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';

export function BaseNotFoundPage() {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>404 — Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The route you requested does not exist in BASE.</p>
          <p>
            <Link to="/event-dashboard">Return to Event Dashboard</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
