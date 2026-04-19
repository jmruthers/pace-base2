import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';

interface BaseNotFoundPageProps {
  knownPaths: ReadonlyArray<string>;
}

export function BaseNotFoundPage({ knownPaths }: BaseNotFoundPageProps) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            The route you requested is not part of the BASE shell implementation plan.
          </p>
          <p>
            Return to the <Link to="/">shell landing page</Link>.
          </p>
          <p>Known shell routes in this implementation:</p>
          <ul>
            {knownPaths.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
