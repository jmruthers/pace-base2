import type { ApplicationCheckRow } from '@/features/applicationsAdmin/types';

function isCheckSatisfiedForMini(status: ApplicationCheckRow['status']): boolean {
  return status === 'satisfied' || status === 'waived';
}

function getChecksMiniCounts(checks: ApplicationCheckRow[]): { satisfied: number; total: number } {
  const total = checks.length;
  const satisfied = checks.filter((item) => isCheckSatisfiedForMini(item.status)).length;
  return { satisfied, total };
}

function dotClassName(status: ApplicationCheckRow['status']): string {
  if (status === 'failed') {
    return 'bg-acc-500';
  }
  if (status === 'pending') {
    return 'bg-sec-400';
  }
  if (isCheckSatisfiedForMini(status)) {
    return 'bg-main-500';
  }
  return 'bg-sec-300';
}

export function ApplicationChecksMini({ checks }: { checks: ApplicationCheckRow[] }) {
  if (checks.length === 0) {
    return null;
  }

  const { satisfied, total } = getChecksMiniCounts(checks);

  return (
    <section className="grid grid-flow-col auto-cols-max items-center gap-2">
      <small>{`${satisfied}/${total}`}</small>
      <ul className="grid grid-flow-col auto-cols-max gap-1" aria-label="Check status">
        {checks.map((check) => (
          <li key={check.id}>
            <span
              className={`block size-2 rounded-full ${dotClassName(check.status)}`}
              title={check.requirement?.check_type ?? check.status}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
