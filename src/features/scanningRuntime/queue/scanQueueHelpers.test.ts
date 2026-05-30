// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQueueEntry, getOrCreateSessionDeviceId } from './scanQueueHelpers';

describe('BA13 scanQueueHelpers', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    vi.stubGlobal(
      'sessionStorage',
      {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
        clear() {
          this.store = {};
        },
        length: 0,
        key: () => null,
      } as Storage
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('buildQueueEntry includes device id and pending sync status', () => {
    const entry = buildQueueEntry({
      scanPointId: 'sp-1',
      cardIdentifier: 'CARD-9',
      scannedAt: 42,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });

    expect(entry.scan_point_id).toBe('sp-1');
    expect(entry.card_identifier).toBe('CARD-9');
    expect(entry.validation_result).toBe('accepted');
    expect(entry.sync_status).toBe('pending');
    expect(entry.device_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(entry.local_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('getOrCreateSessionDeviceId persists id in sessionStorage', () => {
    const first = getOrCreateSessionDeviceId();
    const second = getOrCreateSessionDeviceId();

    expect(first).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(second).toBe(first);
    expect(sessionStorage.getItem('ba13_device_id')).toBe(first);
  });

  it('getOrCreateSessionDeviceId returns new uuid when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);

    const id = getOrCreateSessionDeviceId();
    expect(id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });
});
