import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

export const eventApplicationsReviewQueryKey = (eventId: string | null) =>
  ['event-applications-review', eventId] as const;

type ApplicationsReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      in: (
        column: string,
        values: ReadonlyArray<string>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

interface ApplicationRow {
  id: string;
  status: string | null;
  registration_type_id: string;
}

interface RegistrationTypeNameRow {
  id: string;
  name: string | null;
}

interface CheckRow {
  id: string;
  application_id: string;
  status: string | null;
  requirement_id: string;
}

interface RequirementRow {
  id: string;
  check_type: string | null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export interface ApplicationReviewCheckItem {
  checkId: string;
  checkType: string;
  checkStatus: string;
}

export interface ApplicationReviewListItem {
  applicationId: string;
  registrationType: string;
  status: string;
  checks: ReadonlyArray<ApplicationReviewCheckItem>;
}

export function useEventApplicationsReviewList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery<ReadonlyArray<ApplicationReviewListItem>, Error>({
    queryKey: eventApplicationsReviewQueryKey(eventId),
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      if (eventId == null || secureSupabase == null) {
        return [];
      }

      const client = secureSupabase as unknown as ApplicationsReadClient;

      const { data: appData, error: appError } = await client
        .from('base_application')
        .select('id, status, registration_type_id')
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false });

      if (appError != null) {
        throw new Error(appError.message);
      }

      const appRows = (Array.isArray(appData) ? appData : []) as ReadonlyArray<ApplicationRow>;
      if (appRows.length === 0) {
        return [];
      }

      const registrationTypeIds = [
        ...new Set(appRows.map((row) => asString(row.registration_type_id)).filter((id) => id.length > 0)),
      ];

      const typeNameById = new Map<string, string>();
      if (registrationTypeIds.length > 0) {
        const { data: typeData, error: typeError } = await client
          .from('base_registration_type')
          .select('id, name')
          .in('id', registrationTypeIds);

        if (typeError != null) {
          throw new Error(typeError.message);
        }

        const typeRows = (Array.isArray(typeData) ? typeData : []) as ReadonlyArray<RegistrationTypeNameRow>;
        for (const row of typeRows) {
          typeNameById.set(asString(row.id), asString(row.name));
        }
      }

      const applicationIds = appRows.map((row) => asString(row.id)).filter((id) => id.length > 0);

      const { data: checkData, error: checkError } = await client
        .from('base_application_check')
        .select('id, application_id, status, requirement_id')
        .in('application_id', applicationIds);

      if (checkError != null) {
        throw new Error(checkError.message);
      }

      const checkRows = (Array.isArray(checkData) ? checkData : []) as ReadonlyArray<CheckRow>;
      const requirementIds = [
        ...new Set(checkRows.map((row) => asString(row.requirement_id)).filter((id) => id.length > 0)),
      ];

      const checkTypeByRequirementId = new Map<string, string>();
      if (requirementIds.length > 0) {
        const { data: reqData, error: reqError } = await client
          .from('base_registration_type_requirement')
          .select('id, check_type')
          .in('id', requirementIds);

        if (reqError != null) {
          throw new Error(reqError.message);
        }

        const reqRows = (Array.isArray(reqData) ? reqData : []) as ReadonlyArray<RequirementRow>;
        for (const row of reqRows) {
          checkTypeByRequirementId.set(asString(row.id), asString(row.check_type));
        }
      }

      const checksByApplicationId = new Map<string, ApplicationReviewCheckItem[]>();
      for (const check of checkRows) {
        const appId = asString(check.application_id);
        if (appId.length === 0) {
          continue;
        }
        const list = checksByApplicationId.get(appId) ?? [];
        list.push({
          checkId: asString(check.id),
          checkType: checkTypeByRequirementId.get(asString(check.requirement_id)) ?? 'unknown',
          checkStatus: asString(check.status) || 'pending',
        });
        checksByApplicationId.set(appId, list);
      }

      return appRows.map((row) => {
        const id = asString(row.id);
        return {
          applicationId: id,
          registrationType: typeNameById.get(asString(row.registration_type_id)) ?? 'Unknown type',
          status: asString(row.status) || 'unknown',
          checks: checksByApplicationId.get(id) ?? [],
        };
      });
    },
  });
}
