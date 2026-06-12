// Generates sample roster.csv + placeholder avatar SVGs in /public.
// Run with: npm run gen-sample
// Swap these out for your real roster.csv + /public/photos later.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const photosDir = join(root, "public", "photos");
mkdirSync(photosDir, { recursive: true });

// Each family: children[] + up to 2 parents. `photo: false` => no photo (tests blank case).
const families = [
  {
    children: [{ name: "Emma Smith" }, { name: "Leo Smith" }], // siblings, shared parents
    parents: [
      { name: "John Smith", job: "Architect", company: "Foster + Partners" },
      { name: "Priya Smith", job: "GP", company: "NHS" },
    ],
  },
  {
    children: [{ name: "Olivia Chen" }],
    parents: [
      { name: "Wei Chen", job: "Software Engineer", company: "Monzo" },
      { name: "Sarah Chen", job: "Teacher", company: "Oakfield Primary" },
    ],
  },
  {
    children: [{ name: "Noah Okafor" }],
    parents: [
      { name: "Daniel Okafor", job: "Accountant", company: "Deloitte" },
      { name: "Grace Okafor", job: "Nurse", company: "St Thomas'" },
    ],
  },
  {
    children: [{ name: "Ava Rossi" }, { name: "Mia Rossi" }],
    parents: [
      { name: "Marco Rossi", job: "Chef", company: "Padella" },
      { name: "Elena Rossi", job: "Graphic Designer", company: "Pentagram" },
    ],
  },
  {
    children: [{ name: "Jack Murphy" }],
    parents: [
      // single parent
      { name: "Aoife Murphy", job: "Solicitor", company: "Clifford Chance" },
    ],
  },
  {
    children: [{ name: "Sophia Patel" }],
    parents: [
      { name: "Raj Patel", job: "Pharmacist", company: "Boots" },
      { name: "Anita Patel", job: "Dentist", company: "Bupa", photo: false }, // parent w/o photo
    ],
  },
  {
    children: [{ name: "Charlie Brown" }],
    parents: [
      { name: "Tom Brown", job: "Electrician", company: "Self-employed" },
      { name: "Kate Brown", job: "Marketing Manager", company: "Unilever" },
    ],
  },
  {
    children: [{ name: "Isla Nowak" }, { name: "Oskar Nowak" }],
    parents: [
      { name: "Piotr Nowak", job: "Builder", company: "Nowak Construction" },
      { name: "Magda Nowak", job: "Hairdresser", company: "Toni & Guy" },
    ],
  },
  {
    children: [{ name: "Zara Ali" }],
    parents: [
      { name: "Hassan Ali", job: "Taxi Driver", company: "Uber" },
      { name: "Fatima Ali", job: "Pharmacy Assistant", company: "Superdrug" },
    ],
  },
  {
    children: [{ name: "Finn Walsh", photo: false }], // child w/o photo
    parents: [
      { name: "Liam Walsh", job: "Firefighter", company: "LFB" },
      { name: "Niamh Walsh", job: "Physiotherapist", company: "Nuffield Health" },
    ],
  },
];

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const palette = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e", "#3b82f6"];
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function writeAvatar(name, file) {
  const c = palette[hash(name) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${c}"/>
  <text x="200" y="200" dy="0.35em" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, sans-serif" font-size="160" font-weight="600" fill="#ffffff">${initials(name)}</text>
</svg>`;
  writeFileSync(join(photosDir, file), svg);
}

// Build CSV (one row per child) + avatars. photo column blank when photo === false.
const header = [
  "child_name", "child_photo",
  "parent1_name", "parent1_photo", "parent1_job", "parent1_company",
  "parent2_name", "parent2_photo", "parent2_job", "parent2_company",
];
const rows = [header.join(",")];
const written = new Set();

function photoFor(person) {
  if (person.photo === false) return "";
  const file = `${slug(person.name)}.svg`;
  if (!written.has(file)) {
    writeAvatar(person.name, file);
    written.add(file);
  }
  return file;
}
function csvCell(v) {
  v = v ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

for (const fam of families) {
  const [p1, p2] = fam.parents;
  for (const child of fam.children) {
    const cells = [
      child.name, photoFor(child),
      p1.name, photoFor(p1), p1.job, p1.company,
      p2 ? p2.name : "", p2 ? photoFor(p2) : "", p2 ? p2.job : "", p2 ? p2.company : "",
    ];
    rows.push(cells.map(csvCell).join(","));
  }
}

writeFileSync(join(root, "public", "roster.csv"), rows.join("\n") + "\n");
console.log(`Wrote public/roster.csv (${rows.length - 1} children) and ${written.size} avatars to public/photos/`);
