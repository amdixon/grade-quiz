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
  subjectId: string; // the person this question is about (for de-duping)
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

// Quiz prompts and options use first names only — full names would let you
// cheat parent/child questions by matching surnames.
const fn = (p: Person) => p.firstName;

function genOne(r: Roster, mode: QuizMode): Question | null {
  const kids = children(r);
  const ps = parents(r);
  const parentFirst = ps.map(fn);
  const childFirst = kids.map(fn);

  switch (mode) {
    case "child-to-parent": {
      const eligible = kids.filter((k) => k.relatedIds.length);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const childParents = related(r, child);
      const correct = fn(pick(childParents));
      const built = buildOptions(correct, ps.filter((p) => !childParents.includes(p)).map(fn));
      if (!built) return null;
      return { mode, subjectId: child.id, prompt: `Who is a parent of ${fn(child)}?`, ...built };
    }
    case "parent-to-child": {
      const eligible = ps.filter((p) => p.relatedIds.length);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const kidsOf = related(r, parent);
      const correct = fn(pick(kidsOf));
      const built = buildOptions(correct, kids.filter((k) => !kidsOf.includes(k)).map(fn));
      if (!built) return null;
      return { mode, subjectId: parent.id, prompt: `Whose parent is ${fn(parent)}?`, ...built };
    }
    case "child-name-photo": {
      const eligible = kids.filter((k) => k.photo);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const built = buildOptions(fn(child), childFirst);
      if (!built) return null;
      return { mode, subjectId: child.id, prompt: "Which child is this?", photo: child.photo, ...built };
    }
    case "parent-name-photo": {
      const eligible = ps.filter((p) => p.photo);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const built = buildOptions(fn(parent), parentFirst);
      if (!built) return null;
      return { mode, subjectId: parent.id, prompt: "Which parent is this?", photo: parent.photo, ...built };
    }
    case "child-parents-photo": {
      const eligible = kids.filter((k) => k.photo && k.relatedIds.length);
      if (!eligible.length) return null;
      const child = pick(eligible);
      const childParents = related(r, child);
      const correct = fn(pick(childParents));
      const built = buildOptions(correct, ps.filter((p) => !childParents.includes(p)).map(fn));
      if (!built) return null;
      return { mode, subjectId: child.id, prompt: "Who is a parent of this child?", photo: child.photo, ...built };
    }
    case "parent-child-photo": {
      const eligible = ps.filter((p) => p.photo && p.relatedIds.length);
      if (!eligible.length) return null;
      const parent = pick(eligible);
      const kidsOf = related(r, parent);
      const correct = fn(pick(kidsOf));
      const built = buildOptions(correct, kids.filter((k) => !kidsOf.includes(k)).map(fn));
      if (!built) return null;
      return { mode, subjectId: parent.id, prompt: "Whose parent is this?", photo: parent.photo, ...built };
    }
    case "parent-job": {
      const eligible = ps.filter((p) => jobLabel(p));
      if (eligible.length < 2) return null;
      const parent = pick(eligible);
      const correct = jobLabel(parent);
      const pool = eligible.map(jobLabel).filter((j) => j !== correct);
      const built = buildOptions(correct, pool);
      if (!built) return null;
      return { mode, subjectId: parent.id, prompt: `What does ${fn(parent)} do?`, ...built };
    }
  }
}

// Generate a session of up to `count` questions across the selected modes.
// Two rules:
//   1. Never repeat the same mode back-to-back.
//   2. Never reuse the same (mode, person) question anywhere in the quiz.
// Both relax gracefully if a small roster can't otherwise reach `count`.
export function generateQuiz(r: Roster, modes: QuizMode[], count: number): Question[] {
  const usable = modes.filter((m) => isEligible(r, m));
  if (!usable.length) return [];

  const out: Question[] = [];
  const usedKeys = new Set<string>();
  const keyOf = (q: Question) => `${q.mode}:${q.subjectId}`;
  let lastMode: QuizMode | null = null;

  // Draw one fresh (unused-key) question. When `avoidLastMode`, skip the
  // previous question's mode so the same type never repeats in a row.
  function draw(avoidLastMode: boolean): Question | null {
    for (let i = 0; i < 80; i++) {
      let pool = usable;
      if (avoidLastMode && lastMode && usable.length > 1) {
        pool = usable.filter((m) => m !== lastMode);
      }
      const q = genOne(r, pick(pool));
      if (q && !usedKeys.has(keyOf(q))) return q;
    }
    return null;
  }

  while (out.length < count) {
    const q = draw(true) ?? draw(false); // relax the no-repeat-mode rule before giving up
    if (!q) break; // no fresh questions remain at all
    usedKeys.add(keyOf(q));
    out.push(q);
    lastMode = q.mode;
  }
  return out;
}
