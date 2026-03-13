import { describe, expect, it } from 'vitest';
import { getApiKeyProjectScopeLabels } from './apiKeyProjectScope';

describe('getApiKeyProjectScopeLabels', () => {
  const projectNameMap = new Map([
    ['project-1', 'Alpha'],
    ['project-2', 'Beta'],
    ['project-3', 'Gamma'],
    ['project-4', 'Delta'],
  ]);

  it('returns all-project label for unrestricted keys', () => {
    expect(getApiKeyProjectScopeLabels(null, projectNameMap)).toEqual(['全プロジェクト']);
  });

  it('returns a placeholder when no project is selected', () => {
    expect(getApiKeyProjectScopeLabels([], projectNameMap)).toEqual(['対象プロジェクトなし']);
  });

  it('returns the first three names plus overflow count', () => {
    expect(
      getApiKeyProjectScopeLabels(
        ['project-1', 'project-2', 'project-3', 'project-4'],
        projectNameMap
      )
    ).toEqual(['Alpha', 'Beta', 'Gamma', '+1件']);
  });
});
