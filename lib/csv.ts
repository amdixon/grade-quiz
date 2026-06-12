import type { Person, Roster } from "./types";

// Minimal CSV parser supporting quoted fields, escaped quotes, and CRLF.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

// Builds a roster from CSV text (one row per child, up to 2 parents inline).
// Names are split into first/last columns. Parents are deduped by full name so
// siblings share a single parent record. Grade + grade color are stored on kids.
export function parseRoster(text: string): Roster {
  const rows = parseCsv(text);
  if (rows.length < 2) return { people: [], byId: {} };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const ci = {
    childFirst: col("child_first_name"),
    childLast: col("child_last_name"),
    childPhoto: col("child_photo"),
    childGrade: col("child_grade"),
    childGradeColor: col("child_grade_color"),
  };
  const pCols = [1, 2].map((n) => ({
    first: col(`parent${n}_first_name`),
    last: col(`parent${n}_last_name`),
    photo: col(`parent${n}_photo`),
    job: col(`parent${n}_job`),
    company: col(`parent${n}_company`),
  }));

  const byId: Record<string, Person> = {};
  const parentIdByName: Record<string, string> = {};
  const cell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");

  function ensureParent(row: string[], pc: (typeof pCols)[number]): string | null {
    const name = fullName(cell(row, pc.first), cell(row, pc.last));
    if (!name) return null;
    const key = name.toLowerCase();
    if (parentIdByName[key]) return parentIdByName[key];
    let id = `p-${slug(name)}`;
    let n = 2;
    while (byId[id]) id = `p-${slug(name)}-${n++}`;
    const person: Person = {
      id,
      role: "parent",
      name,
      photo: cell(row, pc.photo) || undefined,
      job: cell(row, pc.job) || undefined,
      company: cell(row, pc.company) || undefined,
      relatedIds: [],
    };
    byId[id] = person;
    parentIdByName[key] = id;
    return id;
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const childName = fullName(cell(row, ci.childFirst), cell(row, ci.childLast));
    if (!childName) continue;

    let childId = `c-${slug(childName)}`;
    let n = 2;
    while (byId[childId]) childId = `c-${slug(childName)}-${n++}`;
    const child: Person = {
      id: childId,
      role: "child",
      name: childName,
      photo: cell(row, ci.childPhoto) || undefined,
      grade: cell(row, ci.childGrade) || undefined,
      gradeColor: cell(row, ci.childGradeColor) || undefined,
      relatedIds: [],
    };
    byId[childId] = child;

    for (const pc of pCols) {
      const pid = ensureParent(row, pc);
      if (!pid) continue;
      if (!child.relatedIds.includes(pid)) child.relatedIds.push(pid);
      if (!byId[pid].relatedIds.includes(childId)) byId[pid].relatedIds.push(childId);
    }
  }

  return { people: Object.values(byId), byId };
}
