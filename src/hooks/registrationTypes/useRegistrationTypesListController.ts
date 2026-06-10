import { useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope } from '@solvera/pace-core/rbac';
import { useRegistrationTypesList } from '@/features/registrationSetup/configuration';
import type { RegistrationTypeRow } from '@/features/registrationSetup/types';
import { registrationScope } from '@/pages/registrationTypes/registrationScope';

export function useRegistrationTypesListController() {
  const navigate = useNavigate();
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const scope = registrationScope({
    organisationId: organisationId ?? selectedOrganisationId,
    eventId: eventId ?? selectedEventId,
    appId,
  });

  const listQuery = useRegistrationTypesList(selectedEventId);
  const listRows = listQuery.data?.types ?? [];
  const eligibilityCounts = listQuery.data?.eligibilityCountsByTypeId ?? {};

  const openCreate = () => {
    navigate('/registration-type-builder');
  };

  const openEdit = (row: RegistrationTypeRow) => {
    navigate(`/registration-type-builder?registrationTypeId=${encodeURIComponent(row.id)}`);
  };

  return {
    scope,
    selectedEventId,
    listQuery,
    listRows,
    eligibilityCounts,
    openCreate,
    openEdit,
  };
}
