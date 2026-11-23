import { useState, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  Flashcard,
  PersistedStudyState,
  UnitNumber,
} from '../types/study';
import { DECO_UNITS } from '../data/decoCurriculum';
import { UnitProgressSummary } from '../utils/progressMetrics';
import { addDaysIso, getTodayIso } from '../utils/scheduleGenerator';

interface ProgressViewProps {
  state: PersistedStudyState;
  allCards: Flashcard[];
  unitSummaries: UnitProgressSummary[];
  readinessPercent: number;
  streakDays: number;
  onStartUnitTest: (unit: UnitNumber) => void;
  onStartUnitFlashcards: (unit: UnitNumber) => void;
  onImportState: (next: PersistedStudyState) => void;
  onResetState: () => void;
}

export function ProgressView({
  state,
  allCards,
  unitSummaries,
  readinessPercent,
  streakDays,
  onStartUnitTest,
  onStartUnitFlashcards,
  onImportState,
  onResetState,
}: ProgressViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const today = getTodayIso();
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const date = addDaysIso(today, idx - 6);
    const log = state.activityLog[date];
    const score =
      (log?.cardsReviewed || 0) +
      (log?.questionsAnswered || 0) * 2 +
      Math.round((log?.minutesStudied || 0) / 5);
    return {
      date,
      shortLabel: date.slice(5),
      minutes: log?.minutesStudied || 0,
      cards: log?.cardsReviewed || 0,
      questions: log?.questionsAnswered || 0,
      intensity: score,
    };
  });

  const maxIntensity = Math.max(10, ...last7Days.map((d) => d.intensity));

  const totalQuestionsAnswered = state.testAttempts.reduce(
    (s, a) => s + a.totalQuestions,
    0
  );
  const totalCorrect = state.testAttempts.reduce((s, a) => s + a.correctCount, 0);
  const overallAccuracy =
    totalQuestionsAnswered > 0 ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : null;

  const masteredCardsCount = Object.values(state.flashcardProgress).filter(
    (p) => p.box === 3
  ).length;

  const handleExportJson = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deco-prep-progress-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PersistedStudyState;
      if (!parsed.config || !parsed.flashcardProgress) {
        setImportNotice('Selected file is not a valid DECO Prep backup.');
        return;
      }
      onImportState(parsed);
      setImportNotice('Study progress restored successfully from backup.');
    } catch {
      setImportNotice('Could not read JSON backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const weakUnits = unitSummaries.filter(
    (s) =>
      state.config.unitConfidence[s.unit] === 'weak' ||
      (s.quizAccuracy !== null && s.quizAccuracy < 65)
  );

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Overall Readiness</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-sky-700 mt-1">
            {readinessPercent}%
          </div>
          <div className="text-xs text-slate-600 mt-1">Goal: {state.config.studentGoalPercent}%</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Practice Test Accuracy</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 mt-1">
            {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-slate-600 mt-1 tabular-nums">
            {totalQuestionsAnswered} questions answered
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Flashcards Mastered</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 mt-1">
            {masteredCardsCount} / {allCards.length}
          </div>
          <div className="text-xs text-slate-600 mt-1 tabular-nums">
            {Object.keys(state.flashcardProgress).length} cards reviewed
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Active Study Streak</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 mt-1">
            {streakDays} days
          </div>
          <div className="text-xs text-slate-600 mt-1 tabular-nums">
            {state.reviewedWrittenIds.length} SAQ/LAQs revised
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Unit Breakdown */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Unit Mastery Breakdown (CO1–CO6)
          </h2>

          <div className="space-y-4">
            {DECO_UNITS.map((u) => {
              const s = unitSummaries.find((x) => x.unit === u.unit)!;
              return (
                <div key={u.unit} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900">
                      {u.code} · {u.shortTitle}
                    </span>
                    <span className="font-mono tabular-nums text-xs text-slate-600">
                      Mastery {s.masteryPercent}% · Cards {s.masteredCards}/{s.totalCards} · Quiz{' '}
                      {s.quizAccuracy !== null ? `${s.quizAccuracy}%` : 'No attempts'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        s.masteryPercent >= 75
                          ? 'bg-emerald-600'
                          : s.masteryPercent < 45
                            ? 'bg-amber-600'
                            : 'bg-sky-600'
                      }`}
                      style={{ width: `${Math.max(3, s.masteryPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {weakUnits.length > 0 && (
            <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Priority Focus Units Detected</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Your scheduler automatically allocates extra blocks to these units until quiz accuracy exceeds 65%:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {weakUnits.map((w) => (
                  <button
                    key={w.unit}
                    type="button"
                    onClick={() => onStartUnitTest(w.unit)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-medium text-amber-950 hover:bg-amber-100 cursor-pointer"
                  >
                    Drill Unit {w.unit} Quiz
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 7-Day Activity Chart */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">7-Day Study Consistency</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Combined daily flashcards reviewed, test questions solved, and scheduled blocks.
            </p>
          </div>

          <div className="pt-2">
            <svg
              viewBox="0 0 350 150"
              className="w-full h-40 overflow-visible"
              role="img"
              aria-label="7-day study consistency bar chart"
            >
              {/* Grid lines */}
              {[0, 0.5, 1].map((ratio, idx) => {
                const y = 115 - ratio * 95;
                return (
                  <line
                    key={idx}
                    x1={10}
                    y1={y}
                    x2={340}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                  />
                );
              })}
              {last7Days.map((day, idx) => {
                const barW = 28;
                const x = 22 + idx * 46;
                const h = Math.max(4, Math.round((day.intensity / maxIntensity) * 95));
                const y = 115 - h;
                return (
                  <g key={day.date}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      rx={4}
                      fill={day.intensity > 0 ? '#0284C7' : '#CBD5E1'}
                    />
                    <text
                      x={x + barW / 2}
                      y={135}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#475569"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {day.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Want more recall on a unit?</span>
            <button
              type="button"
              onClick={() => onStartUnitFlashcards(weakUnits[0]?.unit || 1)}
              className="font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
            >
              Open Unit {weakUnits[0]?.unit || 1} Flashcards
            </button>
          </div>
        </section>
      </div>

      {/* Recent Test Attempts Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Practice Test History</h2>
        {state.testAttempts.length === 0 ? (
          <p className="text-sm text-slate-600">
            No practice tests completed yet. Complete a drill or CIE/SEE mock exam in Practice Tests to track score growth.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Assessment</th>
                  <th className="py-2.5 pr-4">Units</th>
                  <th className="py-2.5 pr-4">Mode</th>
                  <th className="py-2.5 pr-4">Score</th>
                  <th className="py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...state.testAttempts].reverse().map((att) => (
                  <tr key={att.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{att.title}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                      {att.units.map((u) => `U${u}`).join(', ')}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 capitalize">{att.mode}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          att.scorePercent >= 75
                            ? 'text-emerald-700'
                            : att.scorePercent >= 50
                              ? 'text-sky-700'
                              : 'text-amber-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {att.scorePercent}% ({att.correctCount}/{att.totalQuestions})
                        </span>
                      </span>
                    </td>
                    <td className="py-3 font-mono tabular-nums text-xs text-slate-500">
                      {att.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Portable Offline Data Export / Import / Reset */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Portable Offline Backup &amp; Reset
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            All study state lives locally on your device. Export a JSON snapshot anytime or transfer between devices.
          </p>
          {importNotice && (
            <p className="text-xs font-medium text-sky-700 mt-2">{importNotice}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON</span>
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-xs sm:text-sm font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Progress</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetState();
                  setConfirmReset(false);
                }}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 cursor-pointer"
              >
                Confirm Clear All
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
