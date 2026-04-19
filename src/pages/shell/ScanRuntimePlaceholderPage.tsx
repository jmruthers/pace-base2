import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

export function ScanRuntimePlaceholderPage() {
  const { scanPointId } = useParams<{ scanPointId: string }>();

  return (
    <PagePermissionGuard pageName="scanning-runtime" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Scan runtime surface</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This operator route is intentionally outside the authenticated admin shell.
            </p>
            <p>Scan point: {scanPointId ?? 'unknown'}</p>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
