import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  LoadingSpinner,
} from '@solvera/pace-core/components';

import type { ScanningRuntimePageController } from '@/pages/scanning/scanningRuntimeControllerTypes';

import { ScanningRuntimeReadyView } from '@/pages/scanning/components/ScanningRuntimeReadyView';

type Props = {
  page: ScanningRuntimePageController;
};

export function ScanningRuntimePageView({ page }: Props) {
  if (page.status === 'loading_supabase') {
    return (
      <main className="grid min-h-screen place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (page.status === 'loading_scan_point') {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-6">
        <LoadingSpinner />
      </main>
    );
  }

  if (page.status === 'scan_missing') {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-[480px] place-content-start gap-6 px-4 py-6 sm:px-4 sm:py-6">
        <Alert variant="destructive">
          <AlertTitle>Scan point not found</AlertTitle>
          <AlertDescription>
            This scan point could not be loaded. It may have been removed or you may not have permission to access it.
          </AlertDescription>
          <Button type="button" variant="outline" onClick={() => page.navigate('/scanning')}>
            Back to scanning setup
          </Button>
        </Alert>
      </main>
    );
  }

  if (page.status === 'scan_inactive') {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-[480px] place-content-start gap-6 px-4 py-6 sm:px-4 sm:py-6">
        <Alert variant="destructive">
          <AlertTitle>Scan point inactive</AlertTitle>
          <AlertDescription>
            Scan point inactive — this scan point has been deactivated and cannot accept scans.
          </AlertDescription>
          <Button type="button" variant="outline" onClick={() => page.navigate('/scanning')}>
            Back to scanning setup
          </Button>
        </Alert>
      </main>
    );
  }

  return <ScanningRuntimeReadyView surface={page.surface} cardInputRef={page.cardInputRef} />;
}
