import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateElo, mlHealth } from './ml-client';

describe('ml-client', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('updateElo returns parsed result on 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user_elo: 1224, question_elo: 1180 }),
    }));
    const r = await updateElo('u1', 42, true, 1200);
    expect(r).toEqual({ user_elo: 1224, question_elo: 1180 });
  });

  it('updateElo returns null on 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }));
    const r = await updateElo('u1', 42, true, 1200);
    expect(r).toBeNull();
  });

  it('updateElo returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('econnrefused')));
    const r = await updateElo('u1', 42, true, 1200);
    expect(r).toBeNull();
  });

  it('mlHealth returns true on 2xx, false on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }));
    expect(await mlHealth()).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('down')));
    expect(await mlHealth()).toBe(false);
  });
});
