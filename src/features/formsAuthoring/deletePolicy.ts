export function isFormDeleteBlocked(params: {
  responseCount: number;
  registrationBindingCount: number;
}): boolean {
  return params.responseCount > 0 || params.registrationBindingCount > 0;
}
