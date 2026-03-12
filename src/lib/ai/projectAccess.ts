export function filterProjectsForAI<T extends { id: string }>(
  projects: T[],
  allowedProjectIds: string[] | null
): T[] {
  if (allowedProjectIds === null) {
    return projects;
  }

  const allowedProjectIdSet = new Set(allowedProjectIds);
  return projects.filter((project) => allowedProjectIdSet.has(project.id));
}

export function isAIProjectAllowed(
  projectId: string | null | undefined,
  allowedProjectIds: string[] | null
): boolean {
  if (!projectId) {
    return true;
  }

  return allowedProjectIds === null || allowedProjectIds.includes(projectId);
}

export function normalizeAllowedProjectIdsForSave(
  selectedProjectIds: string[],
  allProjectIds: string[]
): string[] | null {
  const allProjectIdSet = new Set(allProjectIds);
  const normalizedSelectedProjectIds = Array.from(new Set(selectedProjectIds))
    .filter((projectId) => allProjectIdSet.has(projectId));

  if (
    normalizedSelectedProjectIds.length === allProjectIds.length &&
    allProjectIds.every((projectId) => normalizedSelectedProjectIds.includes(projectId))
  ) {
    return null;
  }

  return normalizedSelectedProjectIds;
}
