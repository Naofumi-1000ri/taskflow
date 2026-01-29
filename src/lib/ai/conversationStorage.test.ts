import { describe, it, expect } from 'vitest';
import { generateTitleFromMessage } from './conversationStorage';

describe('generateTitleFromMessage', () => {
  it('should return content as-is when under 30 characters', () => {
    expect(generateTitleFromMessage('短いメッセージ')).toBe('短いメッセージ');
  });

  it('should truncate and add ellipsis for long messages', () => {
    const longMessage = 'これは非常に長いメッセージで、30文字を超えるので切り詰められるはずです。';
    const result = generateTitleFromMessage(longMessage);
    expect(result.length).toBe(33); // 30 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle exactly 30 character messages', () => {
    const exact = '123456789012345678901234567890';
    expect(exact.length).toBe(30);
    expect(generateTitleFromMessage(exact)).toBe(exact);
  });

  it('should handle empty string', () => {
    expect(generateTitleFromMessage('')).toBe('');
  });

  it('should handle single character', () => {
    expect(generateTitleFromMessage('a')).toBe('a');
  });
});
