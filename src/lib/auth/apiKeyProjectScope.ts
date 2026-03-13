export function getApiKeyProjectScopeLabels(
  projectIds: string[] | null,
  projectNameMap: Map<string, string>
): string[] {
  if (projectIds === null) {
    return ['全プロジェクト'];
  }

  if (projectIds.length === 0) {
    return ['対象プロジェクトなし'];
  }

  const projectLabels = projectIds.map(
    (projectId) => projectNameMap.get(projectId) || `Project ${projectId.slice(0, 6)}`
  );

  if (projectLabels.length <= 3) {
    return projectLabels;
  }

  return [...projectLabels.slice(0, 3), `+${projectLabels.length - 3}件`];
}
