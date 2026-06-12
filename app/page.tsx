"use client";

import { useEffect, useState } from "react";
import { parseRoster } from "@/lib/csv";
import type { Roster } from "@/lib/types";
import RosterView from "@/components/Roster";
import QuizView from "@/components/Quiz";

type Tab = "roster" | "quiz";

export default function Home() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("roster");

  useEffect(() => {
    fetch("/roster.csv")
      .then((r) => {
        if (!r.ok) throw new Error(`Couldn't load roster.csv (${r.status})`);
        return r.text();
      })
      .then((text) => setRoster(parseRoster(text)))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>{tab === "roster" ? "Grade Roster" : "Quiz"}</h1>
        <p>
          {roster
            ? `${roster.people.filter((p) => p.role === "child").length} children · ${roster.people.filter((p) => p.role === "parent").length} parents`
            : "Loading…"}
        </p>
      </header>

      <main className="content">
        {error && <div className="empty">{error}</div>}
        {!error && !roster && <div className="empty">Loading roster…</div>}
        {!error && roster && tab === "roster" && <RosterView roster={roster} />}
        {!error && roster && tab === "quiz" && <QuizView roster={roster} />}
      </main>

      <nav className="tabbar">
        <div className="inner">
          <button className={`tab ${tab === "roster" ? "active" : ""}`} onClick={() => setTab("roster")}>
            <PeopleIcon />
            Roster
          </button>
          <button className={`tab ${tab === "quiz" ? "active" : ""}`} onClick={() => setTab("quiz")}>
            <QuizIcon />
            Quiz
          </button>
        </div>
      </nav>
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2A3 3 0 0 1 16 11M17 14c2.5.3 4.5 2.2 4.5 4.8" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.2 9a2.8 2.8 0 1 1 3.6 2.7c-.9.3-1.3 1-1.3 2" />
      <path d="M11.5 16.5h.01" />
      <circle cx="12" cy="12" r="9.5" />
    </svg>
  );
}
