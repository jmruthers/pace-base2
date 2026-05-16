import {
  deserializeReportTemplateConfig,
  getReportingExplore,
  serializeReportTemplateConfig,
  type ReportTemplateConfig,
  type ReportingExecutionAdapter,
  type ReportingExecutionData,
  type ReportingExecutionRequest,
  type ReportingExecutionResult,
  type ReportingFieldMeta,
  type ReportingFilter,
  type ReportingMetadataProvider,
  type ReportingScopeValue,
  type ReportingSort,
  type ReportingTemplateRecord,
  type ReportingTemplateSaveInput,
  type ReportingTemplateStore,
} from '@solvera/pace-core/reporting';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';

type ReportingFilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in';

type QueryLike = PromiseLike<{ data: unknown; error: unknown; count?: number | null }> & {
  [method: string]: (...args: unknown[]) => QueryLike;
};

type SupabaseLike = {
  from: (table: string) => Record<string, (...args: unknown[]) => QueryLike>;
};

interface CoreFieldListRow {
  table_name: string;
  field_name: string;
  friendly_field_name: string | null;
  report_availability: boolean;
  report_domains: string[] | null;
  aggregate_strategy: ReportingFieldMeta['aggregateStrategy'];
  aggregate_config: ReportingFieldMeta['aggregateConfig'];
}

interface CoreReportTemplateRow {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  event_id: string;
  organisation_id: string;
  app_id: string;
  domain_id: string;
  selected_fields: string[];
  filters: unknown[];
  sort_config: unknown[];
  column_config: unknown[];
  created_at?: string | null;
}

function asError(message: string, error: unknown): Error {
  const normalized = NormalizeSupabaseError(error);
  if (normalized.message.trim().length > 0) {
    return new Error(normalized.message);
  }
  return new Error(message);
}

function operatorLabel(operator: ReportingFilterOperator): string {
  if (operator === 'contains') {
    return 'contains';
  }
  if (operator === 'starts_with') {
    return 'starts with';
  }
  if (operator === 'ends_with') {
    return 'ends with';
  }
  if (operator === 'in') {
    return 'is one of';
  }
  return operator;
}

function mapQueryError(error: unknown): { code: string; message: string } {
  const normalized = NormalizeSupabaseError(error);
  const message = normalized.message.toLowerCase();
  const tooLarge =
    message.includes('statement timeout') ||
    message.includes('timeout') ||
    message.includes('too many') ||
    message.includes('limit') ||
    message.includes('complex') ||
    message.includes('canceling statement');

  if (tooLarge) {
    return {
      code: 'reporting_query_too_large',
      message:
        'This report query was too large to run. Reduce selected fields or add filters, then run again.',
    };
  }

  return {
    code: 'reporting_query_failed',
    message: normalized.message.trim().length > 0 ? normalized.message : 'Failed to run report query.',
  };
}

function fieldPath(tableName: string, fieldName: string, baseTable: string): string {
  if (tableName === baseTable) {
    return fieldName;
  }
  return `${tableName}.${fieldName}`;
}

function splitFieldKey(fieldKey: string): { tableName: string; fieldName: string } {
  const [tableName, fieldName] = fieldKey.split('.');
  if (
    typeof tableName !== 'string' ||
    tableName.length === 0 ||
    typeof fieldName !== 'string' ||
    fieldName.length === 0
  ) {
    throw new Error(`Invalid report field key "${fieldKey}".`);
  }
  return { tableName, fieldName };
}

function toPrimitiveArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [value];
}

function resolveFieldRawValue(row: Record<string, unknown>, fieldKey: string): unknown {
  const { tableName, fieldName } = splitFieldKey(fieldKey);
  const tableValue = row[tableName];
  if (tableValue != null && typeof tableValue === 'object') {
    if (Array.isArray(tableValue)) {
      return tableValue.map((entry) => {
        if (entry != null && typeof entry === 'object') {
          return (entry as Record<string, unknown>)[fieldName] ?? null;
        }
        return null;
      });
    }
    return (tableValue as Record<string, unknown>)[fieldName] ?? null;
  }
  return row[fieldName] ?? null;
}

function aggregateArrayValue(
  values: unknown[],
  strategy: ReportingFieldMeta['aggregateStrategy']
): unknown {
  const nonNullValues = values.filter((value) => value != null);
  if (strategy == null) {
    return nonNullValues[0] ?? null;
  }
  if (strategy === 'count') {
    return nonNullValues.length;
  }
  if (strategy === 'array_agg') {
    return nonNullValues;
  }
  if (strategy === 'string_agg') {
    return nonNullValues.map(String).join(', ');
  }
  const numericValues = nonNullValues
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) {
    return null;
  }
  if (strategy === 'sum') {
    return numericValues.reduce((sum, value) => sum + value, 0);
  }
  if (strategy === 'avg') {
    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  }
  if (strategy === 'min') {
    return Math.min(...numericValues);
  }
  if (strategy === 'max') {
    return Math.max(...numericValues);
  }
  return nonNullValues[0] ?? null;
}

function mapTemplateRow(row: CoreReportTemplateRow): ReportingTemplateRecord {
  const config = deserializeReportTemplateConfig({
    app_id: row.app_id,
    domain_id: row.domain_id,
    selected_fields: row.selected_fields ?? [],
    filters: (row.filters ?? []) as ReportingFilter[],
    sort_config: (row.sort_config ?? []) as ReportingSort[],
    column_config: (row.column_config ?? []) as ReportTemplateConfig['columnConfig'],
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    is_private: row.is_private,
    created_by: row.created_by,
    config,
  };
}

function applyFilter(query: QueryLike, filter: ReportingFilter, baseTable: string): QueryLike {
  const { tableName, fieldName } = splitFieldKey(filter.fieldKey);
  const column = fieldPath(tableName, fieldName, baseTable);
  if (filter.operator === 'eq') {
    return query.eq(column, filter.value);
  }
  if (filter.operator === 'neq') {
    return query.neq(column, filter.value);
  }
  if (filter.operator === 'gt') {
    return query.gt(column, filter.value);
  }
  if (filter.operator === 'gte') {
    return query.gte(column, filter.value);
  }
  if (filter.operator === 'lt') {
    return query.lt(column, filter.value);
  }
  if (filter.operator === 'lte') {
    return query.lte(column, filter.value);
  }
  if (filter.operator === 'contains') {
    return query.ilike(column, `%${String(filter.value)}%`);
  }
  if (filter.operator === 'starts_with') {
    return query.ilike(column, `${String(filter.value)}%`);
  }
  if (filter.operator === 'ends_with') {
    return query.ilike(column, `%${String(filter.value)}`);
  }
  if (filter.operator === 'in') {
    const values = toPrimitiveArray(filter.value);
    return query.in(column, values);
  }
  throw new Error(`Unsupported filter operator "${operatorLabel(filter.operator)}".`);
}

function applySort(query: QueryLike, sort: ReportingSort, baseTable: string): QueryLike {
  const { tableName, fieldName } = splitFieldKey(sort.fieldKey);
  if (tableName === baseTable) {
    return query.order(fieldName, { ascending: sort.direction === 'asc' });
  }
  return query.order(fieldName, {
    ascending: sort.direction === 'asc',
    foreignTable: tableName,
  });
}

function buildSelectClause(request: ReportingExecutionRequest): string {
  const tableToFields = new Map<string, Set<string>>();
  for (const field of request.plan.selectedFields) {
    if (!tableToFields.has(field.tableName)) {
      tableToFields.set(field.tableName, new Set());
    }
    tableToFields.get(field.tableName)?.add(splitFieldKey(field.fieldKey).fieldName);
  }

  const segments: string[] = [];
  const baseTable = request.plan.explore.baseTable;
  const baseFields = tableToFields.get(baseTable);
  segments.push(baseFields != null && baseFields.size > 0 ? Array.from(baseFields).join(',') : '*');

  for (const join of request.plan.requiredJoins) {
    const joinFields = tableToFields.get(join.table);
    if (joinFields == null || joinFields.size === 0) {
      continue;
    }
    segments.push(`${join.table}(${Array.from(joinFields).join(',')})`);
  }

  return segments.join(',');
}

function makeRow(row: Record<string, unknown>, fields: ReportingFieldMeta[]): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const field of fields) {
    const rawValue = resolveFieldRawValue(row, field.fieldKey);
    if (Array.isArray(rawValue)) {
      next[field.fieldKey] = aggregateArrayValue(rawValue, field.aggregateStrategy ?? null);
      continue;
    }
    next[field.fieldKey] = rawValue;
  }
  return next;
}

export function createReportingMetadataProvider(params: {
  supabase: SupabaseLike;
}): ReportingMetadataProvider {
  const { supabase } = params;
  return {
    getFields: async (exploreKey) => {
      const explore = getReportingExplore(exploreKey);
      if (explore == null) {
        throw new Error(`Unknown reporting explore "${exploreKey}".`);
      }
      const { data, error } = await supabase
        .from('core_field_list')
        .select(
          'table_name, field_name, friendly_field_name, report_availability, report_domains, aggregate_strategy, aggregate_config'
        )
        .eq('report_availability', true)
        .order('table_name', { ascending: true })
        .order('field_name', { ascending: true });
      if (error != null) {
        throw asError('Failed to load reporting fields.', error);
      }
      const rows = (data as CoreFieldListRow[] | null) ?? [];
      return rows
        .filter((row) => row.report_domains?.includes(explore.domainId) === true)
        .map((row) => ({
          fieldKey: `${row.table_name}.${row.field_name}`,
          tableName: row.table_name,
          label: row.friendly_field_name ?? row.field_name,
          reportAvailability: row.report_availability,
          reportDomains: row.report_domains ?? null,
          aggregateStrategy: row.aggregate_strategy ?? null,
          aggregateConfig: row.aggregate_config ?? null,
        }));
    },
  };
}

export function createReportingExecutionAdapter(params: {
  supabase: SupabaseLike;
  scopeValue: ReportingScopeValue;
}): ReportingExecutionAdapter {
  const { supabase, scopeValue } = params;
  return {
    execute: async (request): Promise<ReportingExecutionResult> => {
      const baseTable = request.plan.explore.baseTable;
      const selectClause = buildSelectClause(request);
      let query = supabase
        .from(baseTable)
        .select(selectClause, { count: 'exact' }) as unknown as QueryLike;
      const scopeColumn = fieldPath(request.plan.scopeClause.table, request.plan.scopeClause.column, baseTable);
      query = query.eq(scopeColumn, scopeValue);
      for (const filter of request.plan.filters) {
        query = applyFilter(query, filter, baseTable);
      }
      for (const sort of request.plan.sorts) {
        query = applySort(query, sort, baseTable);
      }
      const { data, error, count } = await query.limit(500);
      if (error != null) {
        return {
          ok: false,
          error: mapQueryError(error),
        };
      }
      const rows = ((data as Record<string, unknown>[] | null) ?? []).map((row) =>
        makeRow(row, request.plan.selectedFields)
      );
      const result: ReportingExecutionData = {
        rows,
        totalCount: typeof count === 'number' ? count : rows.length,
      };
      return { ok: true, data: result };
    },
  };
}

export function createReportingTemplateStore(params: {
  supabase: SupabaseLike;
  eventId: string;
  organisationId: string;
  userId: string;
}): ReportingTemplateStore {
  const { supabase, eventId, organisationId, userId } = params;
  return {
    listTemplates: async () => {
      const { data, error } = await supabase
        .from('core_report_template')
        .select(
          'id, name, description, is_private, created_by, event_id, organisation_id, app_id, domain_id, selected_fields, filters, sort_config, column_config, created_at'
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error != null) {
        throw asError('Failed to load report templates.', error);
      }
      const rows = (data as CoreReportTemplateRow[] | null) ?? [];
      return rows.map((row) => mapTemplateRow(row));
    },
    loadTemplate: async (templateId) => {
      const { data, error } = await supabase
        .from('core_report_template')
        .select(
          'id, name, description, is_private, created_by, event_id, organisation_id, app_id, domain_id, selected_fields, filters, sort_config, column_config, created_at'
        )
        .eq('id', templateId)
        .eq('event_id', eventId)
        .maybeSingle();
      if (error != null) {
        throw asError('Failed to load report template.', error);
      }
      if (data == null) {
        return null;
      }
      return mapTemplateRow(data as CoreReportTemplateRow);
    },
    saveTemplate: async (template: ReportingTemplateSaveInput): Promise<ReportingTemplateRecord> => {
      const name = template.name.trim();
      if (name.length === 0) {
        throw new Error('Template name is required.');
      }
      if (template.config.selectedFieldKeys.length === 0) {
        throw new Error('Select at least one field before saving a template.');
      }
      const serialized = serializeReportTemplateConfig(template.config);
      const payload: Record<string, unknown> = {
        name,
        description: template.description?.trim().length ? template.description.trim() : null,
        is_private: template.is_private,
        event_id: eventId,
        organisation_id: organisationId,
        app_id: serialized.app_id,
        domain_id: serialized.domain_id,
        selected_fields: serialized.selected_fields,
        filters: serialized.filters,
        sort_config: serialized.sort_config,
        column_config: serialized.column_config,
      };

      if (template.id != null) {
        payload.updated_by = userId;
        const { data, error } = await supabase
          .from('core_report_template')['update'](payload)
          .eq('id', template.id)
          .select(
            'id, name, description, is_private, created_by, event_id, organisation_id, app_id, domain_id, selected_fields, filters, sort_config, column_config, created_at'
          )
          .single();
        if (error != null) {
          throw asError('Failed to update report template.', error);
        }
        return mapTemplateRow(data as CoreReportTemplateRow);
      }

      payload.created_by = userId;
      const { data, error } = await supabase
        .from('core_report_template')['insert'](payload)
        .select(
          'id, name, description, is_private, created_by, event_id, organisation_id, app_id, domain_id, selected_fields, filters, sort_config, column_config, created_at'
        )
        .single();
      if (error != null) {
        throw asError('Failed to save report template.', error);
      }
      return mapTemplateRow(data as CoreReportTemplateRow);
    },
    deleteTemplate: async (templateId): Promise<void> => {
      const { error } = await supabase
        .from('core_report_template')['delete']()
        .eq('id', templateId)
        .eq('event_id', eventId);
      if (error != null) {
        throw asError('Failed to delete report template.', error);
      }
    },
  };
}

export function createReadOnlyTemplateStore(params: {
  supabase: SupabaseLike;
  eventId: string;
  organisationId: string;
  userId: string;
}): ReportingTemplateStore {
  const writableStore = createReportingTemplateStore(params);
  return {
    listTemplates: writableStore.listTemplates,
    loadTemplate: writableStore.loadTemplate,
    deleteTemplate: writableStore.deleteTemplate,
    saveTemplate: async (template: ReportingTemplateSaveInput): Promise<ReportingTemplateRecord> => {
      void template;
      throw new Error('You do not have permission to save report templates.');
    },
  };
}

export function isTemplateConfigEquivalent(
  left: ReportTemplateConfig,
  right: ReportTemplateConfig
): boolean {
  return (
    left.exploreKey === right.exploreKey &&
    JSON.stringify(left.selectedFieldKeys) === JSON.stringify(right.selectedFieldKeys) &&
    JSON.stringify(left.filters) === JSON.stringify(right.filters) &&
    JSON.stringify(left.sorts) === JSON.stringify(right.sorts) &&
    JSON.stringify(left.columnConfig) === JSON.stringify(right.columnConfig)
  );
}
