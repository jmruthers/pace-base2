function countNoun(value: number, label: string): string {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

export function isRegistrationTypeDeleteBlocked(params: {
  applicationCount: number;
  formBindingCount: number;
}): boolean {
  return params.applicationCount > 0 || params.formBindingCount > 0;
}

export function buildDeleteBlockedMessageForRegistrationType(params: {
  typeName: string;
  applicationCount: number;
  formBindingCount: number;
}): string {
  const reasons: string[] = [];
  if (params.applicationCount > 0) {
    reasons.push(countNoun(params.applicationCount, 'application'));
  }
  if (params.formBindingCount > 0) {
    reasons.push(countNoun(params.formBindingCount, 'form binding'));
  }

  if (reasons.length === 0) {
    return `'${params.typeName}' cannot be deleted because it has related records. Remove these first before deleting.`;
  }

  if (reasons.length === 1) {
    return `'${params.typeName}' cannot be deleted because it has ${reasons[0]}. Remove these first before deleting.`;
  }

  return `'${params.typeName}' cannot be deleted because it has ${reasons[0]} and ${reasons[1]}. Remove these first before deleting.`;
}
