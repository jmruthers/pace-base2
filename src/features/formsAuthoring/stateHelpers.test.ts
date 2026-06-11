import { describe, expect, it } from 'vitest';
import type { WorkflowAuthoringState } from '@solvera/pace-core/forms';
import {
  asCount,
  buildFieldsRpcPayload,
  parseNullableNumber,
  sortFieldRows,
  toFieldCountMap,
  updateBindingCheckedState,
  updateBindingRequiredState,
} from './stateHelpers';
import type { RegistrationBindingDraft } from './types';

function createBindings(): RegistrationBindingDraft[] {
  return [
    { typeId: 'type-1', checked: true, isRequired: true },
    { typeId: 'type-2', checked: true, isRequired: false },
    { typeId: 'type-3', checked: false, isRequired: false },
  ];
}

function createFields(): WorkflowAuthoringState['fields'] {
  return [
    {
      id: 'field-1',
      fieldKey: 'field.one',
      fieldType: 'text',
      fieldLabel: 'Field One',
      sortOrder: 2,
      isRequired: true,
      isActive: true,
      displayOptions: { placeholder: 'Name' },
    },
    {
      id: 'field-2',
      fieldKey: 'field.two',
      fieldType: 'select',
      fieldLabel: 'Field Two',
      sortOrder: undefined as never,
      isRequired: undefined,
      isActive: true,
    },
  ];
}

describe('formsAuthoring stateHelpers', () => {
  it('parses nullable numbers from whitespace, invalid, and valid inputs', () => {
    expect(parseNullableNumber('')).toBeNull();
    expect(parseNullableNumber('  ')).toBeNull();
    expect(parseNullableNumber('abc')).toBeNull();
    expect(parseNullableNumber(' 42 ')).toBe(42);
    expect(parseNullableNumber('3.5')).toBe(3.5);
  });

  it('updates required flag for a checked binding', () => {
    const next = updateBindingRequiredState(createBindings(), 'type-2', true);
    expect(next).toEqual([
      { typeId: 'type-1', checked: true, isRequired: true },
      { typeId: 'type-2', checked: true, isRequired: true },
      { typeId: 'type-3', checked: false, isRequired: false },
    ]);
  });

  it('clears required when a binding is unchecked', () => {
    const unchecked = updateBindingCheckedState(createBindings(), 'type-1', false);
    expect(unchecked[0]).toEqual({ typeId: 'type-1', checked: false, isRequired: false });
    expect(unchecked[1]).toEqual({ typeId: 'type-2', checked: true, isRequired: false });
    expect(unchecked[2]).toEqual({ typeId: 'type-3', checked: false, isRequired: false });
  });

  it('uses fieldLabel over a stale label still present in displayOptions', () => {
    const payload = buildFieldsRpcPayload([
      {
        id: 'field-1',
        fieldKey: 'generic.name',
        fieldType: 'text',
        fieldLabel: 'Updated label',
        sortOrder: 0,
        isActive: true,
        isRequired: false,
        displayOptions: { label: 'Catalogue label', placeholder: 'Enter name' },
      },
    ]);
    expect(payload[0]?.field_metadata).toEqual({
      label: 'Updated label',
      field_type: 'text',
      placeholder: 'Enter name',
    });
  });

  it('builds field payload with fallback order and required defaults', () => {
    const payload = buildFieldsRpcPayload(createFields());
    expect(payload).toEqual([
      {
        field_key: 'field.one',
        sort_order: 2,
        is_required: true,
        field_metadata: {
          label: 'Field One',
          field_type: 'text',
          placeholder: 'Name',
        },
      },
      {
        field_key: 'field.two',
        sort_order: 1,
        is_required: false,
        field_metadata: {
          label: 'Field Two',
          field_type: 'select',
        },
      },
    ]);
  });

  it('converts counts and sorts/counts helper rows deterministically', () => {
    expect(asCount(2)).toBe(2);
    expect(asCount('7')).toBe(7);
    expect(asCount('bad')).toBe(0);
    expect(asCount(null)).toBe(0);

    expect(sortFieldRows([{ sort_order: 3 }, { sort_order: 1 }, { sort_order: 2 }])).toEqual([
      { sort_order: 1 },
      { sort_order: 2 },
      { sort_order: 3 },
    ]);

    expect(
      toFieldCountMap([
        { form_id: 'form-1' },
        { form_id: 'form-2' },
        { form_id: 'form-1' },
      ])
    ).toEqual({
      'form-1': 2,
      'form-2': 1,
    });
  });
});
