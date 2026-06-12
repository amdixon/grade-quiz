export type Role = "parent" | "child";

export interface Person {
  id: string;
  role: Role;
  name: string;
  photo?: string; // filename under /public/photos
  job?: string; // parents only
  company?: string; // parents only
  grade?: string; // children only (e.g. "G1")
  gradeColor?: string; // children only (e.g. "Blue")
  relatedIds: string[]; // child -> parentIds, parent -> childIds
}

export interface Roster {
  people: Person[];
  byId: Record<string, Person>;
}

export function children(r: Roster): Person[] {
  return r.people.filter((p) => p.role === "child");
}
export function parents(r: Roster): Person[] {
  return r.people.filter((p) => p.role === "parent");
}
export function related(r: Roster, p: Person): Person[] {
  return p.relatedIds.map((id) => r.byId[id]).filter(Boolean);
}
export function jobLabel(p: Person): string {
  if (p.job && p.company) return `${p.job} at ${p.company}`;
  return p.job || p.company || "";
}
