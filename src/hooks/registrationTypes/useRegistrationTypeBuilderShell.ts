import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope } from '@solvera/pace-core/rbac';
import {
  useMembershipTypesForEvent,
  useRegistrationTypesList,
  useRegistrationTypeUpsertMutation,
  useReviewingOrganisationsForEvent,
} from '@/features/registrationSetup/configuration';
import type { RegistrationTypeEligibilityRow, RegistrationTypeRow } from '@/features/registrationSetup/types';
import { registrationScope } from '../registrationScope';

export type RegistrationTypeEditPayload = {
  row: RegistrationTypeRow;
  eligibilityRows: RegistrationTypeEligibilityRow[];
};

export function useRegistrationTypeBuilderShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedOrganisationId, selectedEventId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const scope = registrationScope({
    organisationId: organisationId ?? selectedOrganisationId,
    eventId: eventId ?? selectedEventId,
    appId,
  });

  const registrationTypeIdFromUrl = searchParams.get('registrationTypeId');
  const isEditMode = registrationTypeIdFromUrl != null && registrationTypeIdFromUrl.length > 0;

  const listQuery = useRegistrationTypesList(selectedEventId);
  const upsertMutation = useRegistrationTypeUpsertMutation();

  const eligibilityByTypeId = useMemo(
    () => listQuery.data?.eligibilityByTypeId ?? {},
    [listQuery.data?.eligibilityByTypeId]
  );

  const resolvedRow = useMemo(() => {
    if (!isEditMode || registrationTypeIdFromUrl == null) {
      return null;
    }
    const rows = listQuery.data?.types ?? [];
    return rows.find((row) => row.id === registrationTypeIdFromUrl) ?? null;
  }, [isEditMode, listQuery.data?.types, registrationTypeIdFromUrl]);

  const unknownTypeId =
    isEditMode &&
    !listQuery.isLoading &&
    listQuery.error == null &&
    registrationTypeIdFromUrl != null &&
    resolvedRow == null;

  const membershipTypesQuery = useMembershipTypesForEvent(selectedEventId, true);
  const reviewingOrgsQuery = useReviewingOrganisationsForEvent(
    selectedEventId,
    selectedEventId != null && selectedEventId.length > 0
  );

  return {
    scope,
    setSearchParams,
    selectedOrganisationId,
    selectedEventId,
    registrationTypeIdFromUrl,
    isEditMode,
    listQuery,
    resolvedRow,
    unknownTypeId,
    eligibilityByTypeId,
    upsertMutation,
    membershipTypesQuery,
    reviewingOrgsQuery,
  };
}

export type RegistrationTypeBuilderShell = ReturnType<typeof useRegistrationTypeBuilderShell>;
