import type { Person, Roster } from "./types";
import { children, jobLabel, parents, related } from "./types";

export type QuizMode =
  | "child-to-parent"
  | "parent-to-child"
  | "child-name-photo"
  | "parent-name-photo"
  | "child-parents-photo"
  | "parent-child-photo"
  | "parent-job";

export interface ModeInfo {
  mode: QuizMode;
  label: string;
  blurb: string;
  needsPhoto: boolean;
}

export const MODES: ModeInfo[] = [
  { mode: "child-to-parent", label: "Child → parent", blurb: "Name a child's parent", needsPhoto: false },
  { mode: "parent-to-child", label: "Parent → child", blurb: "Whose parent is this?", needsPhoto: false },
  { mode: "child-name-photo", label: "Child name from photo", blurb: "Identify the child", needsPhoto: true },
  { mode: "parent-name-photo", label: "Parent name from photo", blurb: "Identify the parent", needsPhoto: true },
  { mode: "child-parents-photo", label: "Child's parent from photo", blurb: "Photo of child → parent", needsPhoto: true },
  { mode: "parent-child-photo", label: "Parent's child from photo", blurb: "Photo of parent → child", needsPhoto: true },
  { mode: "parent-job", label: "Parent's job", blurb: "Job / company of a parent", needsPhoto: false },
];

export interface Question {
  mode: QuizMode;
  prompt: string;
  subtitle?: string;
  photo?: string;
  options: string[];
  correctIndex: number;
}

const NUM_OPTIONS = 4;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Sample up to n distinct distractors from pool.
function sample<T>(pool: T[], n: number): T[] {
  return shuffle(pool).slice(0, n);
}

// Build a 4-option MC question. `correct` is the answer label; distractors come
// from `pool` (label strings, already excluding the correct one ideally).
function buildOptions(correct: string, pool: string[]): { options: string[]; correctIndex: number } | null {
  const distractors = sample(
    pool.filter((x) => x && x !== correct),
    NUM_OPTIONS - 1
  );
  if (distractors.length < 1) return null; // need at least one wrong answer
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
}

// Eligibility: how many questions a mode could in principle produce right now.
export function isEligible(r: Roster, mode: QuizMode): boolean {
  const kids = children(r);
  const ps = parents(r);
  const kidsWithPhoto = kids.filter((k) => k.photo);
  const psWithPhoto = ps.filter((p) => p.photo);
  switch (mode) {
    case "child-to-parent":
      return kids.some((k) => k.relatedIds.length) && ps.length >= 2;
    case "parent-to-child":
      return ps.some((p) => p.relatedIds.length) && kids.length >= 2;
    case "child-name-photo":
      return kidsWithPhoto.length >= 1 && kids.length >= 2;
    case "parent-name-photo":
      return psWithPhoto.length >= 1 && ps.length >= 2;
    case "child-parents-photo":
      return kidsWithPhoto.some((k) => k.relatedIds.length) && ps.length >= 2;
    case "parent-child-photo":
      return psWithPhoto.some((p) => p.relatedIds.length) && kids.length >= 2;
    case "parent-job":
      return ps.filter((p) => jobLabel(p)).length >= 2;
  }
}

function genOne(r: Roster, mode: QuizMode): Question | null {
  const kids = children(r);
  const ps = parents(r);
  const parentNames = ps.map((p) => p.name);
  const childNames = kids.map((k) => k.name);

  switch (mode) {
    case "child-to-parent": {
      const eligible = kids.filter((k) => k.relatedIds.length);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const childParents = related(r, child);
      const correct = pick(childParents).name;
      const built = buildOptions(correct, parentNames.filter((n) => !childParents.some((p) => p.name === n)));
      if (!built) return null;
      return { mode, prompt: `Who is a parent of ${child.name}?`, ...built };
    }
    case "parent-to-child": {
      const eligible = ps.filter((p) => p.relatedIds.length);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const kidsOf = related(r, parent);
      const correct = pick(kidsOf).name;
      const built = buildOptions(correct, childNames.filter((n) => !kidsOf.some((k) => k.name === n)));
      if (!built) return null;
      return { mode, prompt: `Whose parent is ${parent.name}?`, ...built };
    }
    case "child-name-photo": {
      const eligible = kids.filter((k) => k.photo);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const built = buildOptions(child.name, childNames);
      if (!built) return null;
      return { mode, prompt: "Which child is this?", photo: child.photo, ...built };
    }
    case "parent-name-photo": {
      const eligible = ps.filter((p) => p.photo);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const built = buildOptions(parent.name, parentNames);
      if (!built) return null;
      return { mode, prompt: "Which parent is this?", photo: parent.photo, ...built };
    }
    case "child-parents-photo": {
      const eligible = kids.filter((k) => k.photo && k.relatedIds.length);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const childParents = related(r, child);
      const correct = pick(childParents).name;
      const built = buildOptions(correct, parentNames.filter((n) => !childParents.some((p) => p.name === n)));
      if (!built) return null;
      return { mode, prompt: "Who is a parent of this child?", photo: child.photo, ...built };
    }
    case "parent-child-photo": {
      const eligible = ps.filter((p) => p.photo && p.relatedIds.length);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const kidsOf = related(r, parent);
      const correct = pick(kidsOf).name;
      const built = buildOptions(correct, childNames.filter((n) => !kidsOf.some((k) => k.name === n)));
      if (!built) return null;
      return { mode, prompt: "Whose parent is this?", photo: parent.photo, ...built };
    }
    case "parent-job": {
      const eligible = ps.filter((p) => jobLabel(p));
      if (eligible.length < 2) return null;
      const parent = pick(eligible);
      const correct = jobLabel(parent);
      const pool = eligible.map(jobLabel).filter((j) => j !== correct);
      const built = buildOptions(correct, pool);
      if (!built) return null;
      return { mode, prompt: `What does ${parent.name} do?`, ...built };
    }
  }
}

// Generate a session of up to `count` questions across the selected modes.
// Avoids immediate repeats where possible; skips modes that can't produce one.
export function generateQuiz(r: Roster, modes: QuizMode[], count: number): Question[] {
  const usable = modes.filter((m) => isEligible(r, m));
  if (!usable.length) return [];
  const out: Question[] = [];
  let lastKey = "";
  let misses = 0;
  while (out.length < count && misses < count * 4 + 20) {
    const mode = pick(usable);
    const q = genOne(r, mode);
    if (!q) {
      misses++;
      continue;
    }
    const key = `${q.mode}|${q.prompt}|${q.photo ?? ""}`;
    if (key === lastKey && usable.length > 1) {
      misses++;
      continue;
    }
    lastKey = key;
    out.push(q);
  }
  return out;
}
