import { describe, expect, it } from 'vitest';
import {
  filterProjectsForAI,
  isAIProjectAllowed,
  normalizeAllowedProjectIdsForSave,
} from './projectAccess';

describe('AI project access helpers', () => {
  const projects = [
    { id: 'project-1', name: 'One' },
    { id: 'project-2', name: 'Two' },
    { id: 'project-3', name: 'Three' },
  ];

  describe('filterProjectsForAI', () => {
    it('returns all projects when access is unrestricted', () => {
      expect(filterProjectsForAI(projects, null)).toEqual(projects);
    });

    it('filters projects to the configured subset', () => {
      expect(filterProjectsForAI(projects, ['project-2'])).toEqual([
        { id: 'project-2', name: 'Two' },
      ]);
    });
  });

  describe('isAIProjectAllowed', () => {
    it('allows any project when access is unrestricted', () => {
      expect(isAIProjectAllowed('project-1', null)).toBe(true);
    });

    it('rejects projects outside the configured subset', () => {
      expect(isAIProjectAllowed('project-3', ['project-1', 'project-2'])).toBe(false);
    });
  });

  describe('normalizeAllowedProjectIdsForSave', () => {
    it('stores null when every current project is selected', () => {
      expect(
        normalizeAllowedProjectIdsForSave(
          ['project-1', 'project-2', 'project-3'],
          ['project-1', 'project-2', 'project-3']
        )
      ).toBeNull();
    });

    it('stores only selected projects when the selection is restricted', () => {
      expect(
        normalizeAllowedProjectIdsForSave(
          ['project-1', 'project-3'],
          ['project-1', 'project-2', 'project-3']
        )
      ).toEqual(['project-1', 'project-3']);
    });
  });
});
