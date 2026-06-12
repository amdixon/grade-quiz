"use client";

import { useMemo, useState } from "react";
import type { Person, Roster } from "@/lib/types";
import { jobLabel, related } from "@/lib/types";
import Avatar from "./Avatar";

type Filter = "all" | "child" | "parent";

export default function RosterView({ roster }: { roster: Roster }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let people = roster.people;
    if (filter !== "all") people = people.filter((p) => p.role === filter);
    if (needle) {
      people = people.filter((p) => {
        const rel = related(roster, p).map((r) => r.name).join(" ");
        const hay = `${p.name} ${p.job ?? ""} ${p.company ?? ""} ${rel}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    return [...people].sort((a, b) => a.name.localeCompare(b.name));
  }, [q, filter, roster]);

  return (
    <div>
      <div className="search">
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, jobs, companies…"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <div className="segmented">
        {(["all", "child", "parent"] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "child" ? "Children" : "Parents"}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="empty">No matches.</div>
      ) : (
        <div className="list">
          {results.map((p) => (
            <PersonRow key={p.id} person={p} roster={roster} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, roster }: { person: Person; roster: Roster }) {
  const rel = related(roster, person);
  const relLabel = rel.map((r) => r.name).join(", ");
  return (
    <div className="person">
      <Avatar name={person.name} photo={person.photo} />
      <div className="info">
        <div className="name">
          {person.name}
          <span className={`tag ${person.role}`}>{person.role}</span>
        </div>
        {person.role === "parent" && jobLabel(person) && <div className="sub">{jobLabel(person)}</div>}
        {relLabel && (
          <div className="rel">
            {person.role === "child" ? "Parent: " : "Child: "}
            {relLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
