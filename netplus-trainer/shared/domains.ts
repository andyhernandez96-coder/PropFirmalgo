export const DOMAINS = [
  { id: '1.0', name: 'Networking Concepts', weight: 0.23 },
  { id: '2.0', name: 'Network Implementation', weight: 0.2 },
  { id: '3.0', name: 'Network Operations', weight: 0.19 },
  { id: '4.0', name: 'Network Security', weight: 0.14 },
  { id: '5.0', name: 'Network Troubleshooting', weight: 0.24 },
] as const;

export type DomainId = (typeof DOMAINS)[number]['id'];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id) as [DomainId, ...DomainId[]];

export function domainName(id: DomainId): string {
  return DOMAINS.find((d) => d.id === id)?.name ?? id;
}

export function domainWeight(id: DomainId): number {
  return DOMAINS.find((d) => d.id === id)?.weight ?? 0;
}

/** "2.3" -> "2.0"; returns undefined when the objective does not map to a domain. */
export function domainFromObjective(objective: string): DomainId | undefined {
  const major = objective.trim().split('.')[0];
  const candidate = `${major}.0`;
  return (DOMAIN_IDS as readonly string[]).includes(candidate) ? (candidate as DomainId) : undefined;
}

export const EXAM_DEFAULT_QUESTIONS = 90;
export const EXAM_DEFAULT_MINUTES = 90;
