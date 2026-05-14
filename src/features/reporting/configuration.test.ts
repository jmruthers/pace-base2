import { describe, expect, it, vi } from 'vitest';
import {
  createReportingExecutionAdapter,
  createReportingMetadataProvider,
  createReportingTemplateStore,
} from './configuration';

function resolvedChain<T extends object>(result: { data: unknown; error: unknown; count?: number | null }, chain: T) {
  return Object.assign(chain, {
    then: (onFulfilled: (value: typeof result) => unknown) => Promise.resolve(onFulfilled(result)),
  });
}

describe('reporting configuration', () => {
  it('maps and filters reporting field metadata by explore domain', async () => {
    const rows = [
      {
        table_name: 'base_application',
        field_name: 'id',
        friendly_field_name: 'Application ID',
        report_availability: true,
        report_domains: ['participant'],
        aggregate_strategy: null,
        aggregate_config: null,
      },
      {
        table_name: 'base_units',
        field_name: 'id',
        friendly_field_name: 'Unit ID',
        report_availability: true,
        report_domains: ['unit'],
        aggregate_strategy: null,
        aggregate_config: null,
      },
    ];

    const chain = resolvedChain(
      { data: rows, error: null },
      {
        eq: () => chain,
        order: () => chain,
      }
    );

    const supabase = {
      from: () => ({
        select: () => chain,
      }),
    } as unknown as Parameters<typeof createReportingMetadataProvider>[0]['supabase'];
    const provider = createReportingMetadataProvider({ supabase });
    const fields = await provider.getFields('base.participant');
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      fieldKey: 'base_application.id',
      tableName: 'base_application',
      label: 'Application ID',
    });
  });

  it('maps statement-timeout failures to query-too-large errors', async () => {
    const query = {
      eq: vi.fn(() => query),
      neq: vi.fn(() => query),
      gt: vi.fn(() => query),
      gte: vi.fn(() => query),
      lt: vi.fn(() => query),
      lte: vi.fn(() => query),
      ilike: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      then: (onFulfilled: (value: { data: unknown; error: unknown; count?: number | null }) => unknown) =>
        Promise.resolve(
          onFulfilled({
            data: null,
            error: new Error('canceling statement due to statement timeout'),
            count: null,
          })
        ),
    };
    const supabase = {
      from: () => ({
        select: () => query,
      }),
    } as unknown as Parameters<typeof createReportingExecutionAdapter>[0]['supabase'];

    const adapter = createReportingExecutionAdapter({ supabase, scopeValue: 'event-1' });
    const response = await adapter.execute({
      plan: {
        explore: {
          key: 'base.participant',
          label: 'Participants',
          domainId: 'participant',
          appId: 'base',
          baseTable: 'base_application',
          scopeColumn: 'event_id',
          joins: [],
        },
        selectedFields: [
          {
            fieldKey: 'base_application.id',
            tableName: 'base_application',
            label: 'Application ID',
            reportAvailability: true,
            reportDomains: ['participant'],
          },
        ],
        selectedTables: ['base_application'],
        requiredJoins: [],
        groupByFieldKeys: [],
        aggregations: [],
        filters: [],
        sorts: [],
        scopeClause: {
          table: 'base_application',
          column: 'event_id',
          operator: 'eq',
          value: 'event-1',
        },
      },
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('reporting_query_too_large');
      expect(response.error.message).toContain('too large');
    }
  });

  it('saves and loads report templates with serialized config columns', async () => {
    let storedRow: Record<string, unknown> | null = null;

    const supabase = {
      from: () => ({
        select: () => {
          const filters: Record<string, unknown> = {};
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value;
              return query;
            },
            order: () => query,
            maybeSingle: async () => {
              if (storedRow == null) {
                return { data: null, error: null };
              }
              if (
                filters.id != null &&
                filters.id !== storedRow.id &&
                filters.event_id !== storedRow.event_id
              ) {
                return { data: null, error: null };
              }
              return { data: storedRow, error: null };
            },
            then: (onFulfilled: (value: { data: unknown; error: unknown }) => unknown) =>
              Promise.resolve(onFulfilled({ data: storedRow == null ? [] : [storedRow], error: null })),
          };
          return query;
        },
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              storedRow = {
                ...payload,
                id: 'tpl-1',
                created_by: payload.created_by,
                created_at: '2026-05-14T10:00:00.000Z',
              };
              return { data: storedRow, error: null };
            },
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: storedRow, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              then: (onFulfilled: (value: { data: unknown; error: unknown }) => unknown) =>
                Promise.resolve(onFulfilled({ data: null, error: null })),
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof createReportingTemplateStore>[0]['supabase'];

    const store = createReportingTemplateStore({
      supabase,
      eventId: 'event-1',
      organisationId: 'org-1',
      userId: 'user-1',
    });

    const saved = await store.saveTemplate({
      name: 'My template',
      is_private: true,
      config: {
        exploreKey: 'base.participant',
        selectedFieldKeys: ['base_application.id'],
        filters: [],
        sorts: [],
        columnConfig: [],
      },
    });

    expect(saved.name).toBe('My template');
    expect(storedRow?.['event_id']).toBe('event-1');
    expect(storedRow?.['organisation_id']).toBe('org-1');
    expect(storedRow?.['app_id']).toBe('base');
    expect(storedRow?.['domain_id']).toBe('participant');

    const loaded = await store.loadTemplate('tpl-1');
    expect(loaded?.config.exploreKey).toBe('base.participant');
    expect(loaded?.config.selectedFieldKeys).toEqual(['base_application.id']);
  });
});
