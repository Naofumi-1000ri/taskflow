import { afterEach, describe, expect, it, vi } from 'vitest';
import { readImageUrlAsDataURL } from './image';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('readImageUrlAsDataURL', () => {
  it('converts a fetched image blob into a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue(
      {
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(blob),
      } satisfies Partial<Response>
    ) as typeof fetch;

    const result = await readImageUrlAsDataURL('https://example.com/image.png');

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.png');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('throws when the image request fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } satisfies Partial<Response>) as typeof fetch;

    await expect(readImageUrlAsDataURL('https://example.com/missing.png')).rejects.toThrow(
      'Failed to fetch image: 404'
    );
  });
});
