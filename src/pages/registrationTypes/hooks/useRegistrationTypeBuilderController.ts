import {
  type RegistrationTypeBuilderShell,
  useRegistrationTypeBuilderShell,
} from './useRegistrationTypeBuilderShell';
import { useRegistrationTypeBuilderDraft } from './useRegistrationTypeBuilderDraft';

export function useCombinedRegistrationBuilder(shell: RegistrationTypeBuilderShell) {
  const draft = useRegistrationTypeBuilderDraft(shell);
  return { ...shell, ...draft };
}

/** Full builder API for tests/single-hook consumers; prefers page-level keyed mount via shell + draft. */
export function useRegistrationTypeBuilderController() {
  const shell = useRegistrationTypeBuilderShell();
  return useCombinedRegistrationBuilder(shell);
}
