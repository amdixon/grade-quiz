"use client";

import { useMemo, useRef, useState } from "react";
import type { Roster } from "@/lib/types";
import { MODES, type QuizMode, type Question, generateQuiz, isEligible } from "@/lib/quiz";

const QUESTION_COUNT = 10;

type Phase = "play" | "done";
interface Answer {
  q: Question;
  pickedIndex: number;
  correct: boolean;
}

export default function QuizView({ roster }: { roster: Roster }) {
  const eligible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const m of MODES) map[m.mode] = isEligible(roster, m.mode);
    return map;
  }, [roster]);

  const initialModes = useMemo(() => MODES.filter((m) => eligible[m.mode]).map((m) => m.mode), [eligible]);

  // All eligible modes on by default; length is fixed at 10.
  const [selected, setSelected] = useState<Set<QuizMode>>(() => new Set(initialModes));
  const [questions, setQuestions] = useState<Question[]>(() => generateQuiz(roster, initialModes, QUESTION_COUNT));
  const [phase, setPhase] = useState<Phase>("play");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function start(modes: Set<QuizMode> = selected) {
    setQuestions(generateQuiz(roster, [...modes], QUESTION_COUNT));
    setIdx(0);
    setPicked(null);
    setAnswers([]);
    setPhase("play");
  }

  function choose(i: number) {
    if (picked !== null) return;
    const q = questions[idx];
    setPicked(i);
    setAnswers((a) => [...a, { q, pickedIndex: i, correct: i === q.correctIndex }]);
  }

  function next() {
    if (idx + 1 >= questions.length) setPhase("done");
    else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  // Settings sheet — regenerate only if the mode selection actually changed.
  const snapshot = useRef("");
  function openSettings() {
    snapshot.current = [...selected].sort().join(",");
    setSettingsOpen(true);
  }
  function closeSettings() {
    setSettingsOpen(false);
    const now = [...selected].sort().join(",");
    if (now !== snapshot.current && selected.size) start();
  }
  function toggle(mode: QuizMode) {
    if (!eligible[mode]) return;
    setSelected((prev) => {
      const nextSet = new Set(prev);
      nextSet.has(mode) ? nextSet.delete(mode) : nextSet.add(mode);
      return nextSet;
    });
  }

  return (
    <>
      {questions.length === 0 ? (
        <div className="empty">
          <p>No quiz modes selected.</p>
          <button className="btn-ghost" onClick={openSettings} style={{ marginTop: 12 }}>
            Choose modes
          </button>
        </div>
      ) : phase === "done" ? (
        <Results answers={answers} onAgain={() => start()} onOpenSettings={openSettings} />
      ) : (
        <Play
          q={questions[idx]}
          index={idx}
          total={questions.length}
          picked={picked}
          onChoose={choose}
          onNext={next}
          onOpenSettings={openSettings}
        />
      )}

      {settingsOpen && (
        <SettingsSheet eligible={eligible} selected={selected} toggle={toggle} onClose={closeSettings} />
      )}
    </>
  );
}

function Play({
  q,
  index,
  total,
  picked,
  onChoose,
  onNext,
  onOpenSettings,
}: {
  q: Question;
  index: number;
  total: number;
  picked: number | null;
  onChoose: (i: number) => void;
  onNext: () => void;
  onOpenSettings: () => void;
}) {
  const answered = picked !== null;
  return (
    <div>
      <div className="progress">
        <span>
          Question {index + 1} / {total}
        </span>
        <button className="iconbtn" onClick={onOpenSettings} aria-label="Quiz settings">
          <GearIcon />
        </button>
      </div>
      <div className="bar">
        <span style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <div className="card">
        {q.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="qphoto" src={`/photos/${q.photo}`} alt="Quiz photo" />
        )}
        <p className="qprompt">{q.prompt}</p>
        {q.subtitle && <p className="qsub">{q.subtitle}</p>}

        <div className="options">
          {q.options.map((opt, i) => {
            let cls = "option";
            if (answered) {
              if (i === q.correctIndex) cls += " correct";
              else if (i === picked) cls += " wrong";
              else cls += " dim";
            }
            return (
              <button key={i} className={cls} disabled={answered} onClick={() => onChoose(i)}>
                <span>{opt}</span>
                {answered && i === q.correctIndex && <CheckMark />}
                {answered && i === picked && i !== q.correctIndex && <CrossMark />}
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className="nextwrap">
          <button className="btn-primary" onClick={onNext}>
            {index + 1 >= total ? "See results" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}

function Results({
  answers,
  onAgain,
  onOpenSettings,
}: {
  answers: Answer[];
  onAgain: () => void;
  onOpenSettings: () => void;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div>
      <div className="card">
        <div className="scorebig">
          <div className="pct">{pct}%</div>
          <div className="frac">
            {correct} of {total} correct
          </div>
        </div>
      </div>

      <div className="review">
        {answers.map((a, i) => (
          <div className="item" key={i}>
            <span className={`dot ${a.correct ? "good" : "bad"}`} />
            <div style={{ minWidth: 0 }}>
              <div className="q">{a.q.prompt}</div>
              <div className="a">
                {a.correct ? (
                  <>Correct: {a.q.options[a.q.correctIndex]}</>
                ) : (
                  <>
                    You: {a.q.options[a.pickedIndex]} · Answer: {a.q.options[a.q.correctIndex]}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn-primary" onClick={onAgain}>
          New quiz
        </button>
        <button className="btn-ghost" onClick={onOpenSettings}>
          Change modes
        </button>
      </div>
    </div>
  );
}

function SettingsSheet({
  eligible,
  selected,
  toggle,
  onClose,
}: {
  eligible: Record<string, boolean>;
  selected: Set<QuizMode>;
  toggle: (m: QuizMode) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>Quiz modes</h2>
          <button className="sheet-done" onClick={onClose}>
            Done
          </button>
        </div>
        <p className="sheet-note">10 questions, drawn at random from the modes you pick.</p>
        <div className="modegrid">
          {MODES.map((m) => {
            const on = selected.has(m.mode);
            const ok = eligible[m.mode];
            return (
              <button
                key={m.mode}
                className={`moderow ${on && ok ? "on" : ""}`}
                disabled={!ok}
                onClick={() => toggle(m.mode)}
              >
                <span className="check">
                  <CheckIcon />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="ttl">{m.label}</span>
                  <br />
                  <span className="blurb">{ok ? m.blurb : "Needs more photos / data"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M5 12l5 5L20 6" />
    </svg>
  );
}
function CheckMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 6" />
    </svg>
  );
}
function CrossMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
