import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useParams } from 'react-router-dom';

interface FormRouteSurfacePageProps {
  mode: 'preview' | 'share';
}

export function FormRouteSurfacePage({ mode }: FormRouteSurfacePageProps) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <PagePermissionGuard pageName="forms" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'preview' ? 'Form preview link' : 'Form share link'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This route confirms that the selected form link resolves inside BASE.</p>
            <p>Slug: {slug ?? 'Unknown form'}</p>
            <p>Participant-facing rendering is owned by the portal surface.</p>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
