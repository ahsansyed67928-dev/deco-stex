import { useState, useEffect, useMemo } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  PersistedStudyState,
  PracticeQuestion,
  TestAttempt,
  UnitNumber,
} from '../types/study';
import {
  DECO_UNITS,
  PRACTICE_QUESTIONS,
  WRITTEN_BANK,
} from '../data/decoCurriculum';

interface PracticeViewProps {
  state: PersistedStudyState;
  initialUnitFilter: UnitNumber | 'all';
  autoStartTrigger?: { unit: UnitNumber | 'all'; nonce: number } | null;
  onSaveAttempt: (attempt: TestAttempt) => void;
  onToggleWrittenReviewed: (id: string) => void;
}

type SubTab = 'tests' | 'written';
type RunnerStage = 'builder' | 'active' | 'review';

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PracticeView({
  state,
  initialUnitFilter,
  autoStartTrigger,
  onSaveAttempt,
  onToggleWrittenReviewed,
}: PracticeViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('tests');
  const [stage, setStage] = useState<RunnerStage>('builder');

  // Builder state
  const [selectedUnits, setSelectedUnits] = useState<UnitNumber[]>(
    initialUnitFilter === 'all' ? [1, 2, 3, 4, 5] : [initialUnitFilter]
  );
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [testMode, setTestMode] = useState<'study' | 'timed'>('study');
  const [testTitle, setTestTitle] = useState<string>('Custom DECO Practice Set');

  // Active test state
  const [activeQuestions, setActiveQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);

  // Written bank filter
  const [writtenUnitFilter, setWrittenUnitFilter] = useState<UnitNumber | 'all'>('all');
  const [writtenImgErrors, setWrittenImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialUnitFilter !== 'all') {
      setSelectedUnits([initialUnitFilter]);
    }
  }, [initialUnitFilter]);

  useEffect(() => {
    if (!autoStartTrigger) return;
    const units: UnitNumber[] =
      autoStartTrigger.unit === 'all' ? [1, 2, 3, 4, 5] : [autoStartTrigger.unit];
    const count = autoStartTrigger.unit === 'all' ? 15 : 8;
    const label =
      autoStartTrigger.unit === 'all'
        ? 'Full SEE Timed Simulation'
        : `Unit ${autoStartTrigger.unit} Mastery Drill`;
    launchTest(units, count, autoStartTrigger.unit === 'all' ? 'timed' : 'study', label);
  }, [autoStartTrigger]);

  // Timer for active test
  useEffect(() => {
    if (stage !== 'active') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const availablePool = useMemo(
    () => PRACTICE_QUESTIONS.filter((q) => selectedUnits.includes(q.unit)),
    [selectedUnits]
  );

  const launchTest = (
    units: UnitNumber[],
    count: number,
    mode: 'study' | 'timed',
    title: string
  ) => {
    const pool = PRACTICE_QUESTIONS.filter((q) => units.includes(q.unit));
    if (pool.length === 0) return;

    // Deterministic spread across selected units + slight shuffle
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    const rotated = sorted
      .map((item, idx) => ({ item, score: ((idx * 11 + Date.now()) % 97) }))
      .sort((a, b) => a.score - b.score)
      .map((x) => x.item)
      .slice(0, Math.min(count, pool.length));

    setSubTab('tests');
    setSelectedUnits(units);
    setTestMode(mode);
    setTestTitle(title);
    setActiveQuestions(rotated);
    setAnswers({});
    setCurrentQIdx(0);
    setElapsedSeconds(0);
    setLastAttempt(null);
    setStage('active');
  };

  const toggleUnitSelection = (u: UnitNumber) => {
    setSelectedUnits((prev) =>
      prev.includes(u)
        ? prev.length > 1
          ? prev.filter((x) => x !== u)
          : prev
        : [...prev, u].sort((a, b) => a - b)
    );
  };

  const handleFinishTest = () => {
    const perUnit: Partial<Record<UnitNumber, { correct: number; total: number }>> = {};
    let correctCount = 0;

    activeQuestions.forEach((q) => {
      const uEntry = perUnit[q.unit] || { correct: 0, total: 0 };
      uEntry.total += 1;
      if (answers[q.id] === q.correctIndex) {
        correctCount += 1;
        uEntry.correct += 1;
      }
      perUnit[q.unit] = uEntry;
    });

    const totalQuestions = activeQuestions.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt: TestAttempt = {
      id: `test-${Date.now()}`,
      title: testTitle,
      mode: testMode,
      units: selectedUnits,
      createdAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      totalQuestions,
      correctCount,
      scorePercent,
      perUnit,
      answers,
      questionIds: activeQuestions.map((q) => q.id),
    };

    onSaveAttempt(attempt);
    setLastAttempt(attempt);
    setStage('review');
  };

  const currentQuestion = activeQuestions[currentQIdx];
  const answeredCount = activeQuestions.filter((q) => answers[q.id] !== undefined).length;
  const timeBudgetSeconds = activeQuestions.length * 60;
  const remainingSeconds = Math.max(0, timeBudgetSeconds - elapsedSeconds);

  return (
    <div className="space-y-6">
      {/* Sub-navigation between Practice Tests and SAQ/LAQ Solution Bank */}
      {stage === 'builder' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Practice Tests &amp; Exam Question Bank
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              42 objective questions + CIE/SEE Short &amp; Long Answer model solutions mapped to CO &amp; BTL.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSubTab('tests')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                subTab === 'tests'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Interactive Practice Tests
            </button>
            <button
              type="button"
              onClick={() => setSubTab('written')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                subTab === 'written'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              SAQ &amp; LAQ Answer Bank ({WRITTEN_BANK.length})
            </button>
          </div>
        </div>
      )}

      {subTab === 'written' && stage === 'builder' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setWrittenUnitFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                writtenUnitFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Units ({WRITTEN_BANK.length})
            </button>
            {DECO_UNITS.map((u) => (
              <button
                key={u.unit}
                type="button"
                onClick={() => setWrittenUnitFilter(u.unit)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  writtenUnitFilter === u.unit
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Unit {u.unit}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {WRITTEN_BANK.filter(
              (item) => writtenUnitFilter === 'all' || item.unit === writtenUnitFilter
            ).map((item) => {
              const reviewed = state.reviewedWrittenIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-500">
                      Unit {item.unit} · {item.co} · {item.btl} · {item.kind} ({item.marks} Marks) ·{' '}
                      {item.sourceTag}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleWrittenReviewed(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                        reviewed
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <BookOpenCheck className="w-3.5 h-3.5" />
                      <span>{reviewed ? 'Marked Revised' : 'Mark as Revised'}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>

                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                    {item.answerPoints.map((pt, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {pt}
                      </li>
                    ))}
                  </ul>

                  {item.keyFormulaOrRtl && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2 font-mono text-xs text-slate-800">
                      {item.keyFormulaOrRtl}
                    </div>
                  )}

                  {item.diagramUrl && !writtenImgErrors[item.id] && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white max-w-md">
                      <img
                        src={item.diagramUrl}
                        alt={item.diagramAlt || item.question}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setWrittenImgErrors((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-auto max-h-56 object-contain"
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : stage === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Exam Presets */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Quick Exam Simulations</h2>
            <div className="space-y-3">
              {[
                {
                  title: 'CIE-1 Mock Exam (Units I & II)',
                  desc: '15 mixed questions on Data Representation, Boolean Algebra, K-Maps, Adders & Flip-Flops.',
                  units: [1, 2] as UnitNumber[],
                  count: 15,
                  mode: 'timed' as const,
                },
                {
                  title: 'CIE-2 Mock Exam (Units III, IV & V)',
                  desc: '20 questions on Booth’s, Division, RTL, Microprogrammed Control, DMA, Cache & Pipelining.',
                  units: [3, 4, 5] as UnitNumber[],
                  count: 20,
                  mode: 'timed' as const,
                },
                {
                  title: 'Full SEE University Simulation (All 5 Units)',
                  desc: '25-question timed end-semester readiness simulation across CO1–CO6.',
                  units: [1, 2, 3, 4, 5] as UnitNumber[],
                  count: 25,
                  mode: 'timed' as const,
                },
              ].map((preset) => (
                <div
                  key={preset.title}
                  className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 bg-slate-50/50"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{preset.title}</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{preset.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {preset.count} Qs · {preset.count} min timed
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        launchTest(preset.units, preset.count, preset.mode, preset.title)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Mock</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Builder */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Custom Practice Builder</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Pick specific syllabus units, length, and Study vs. Timed feedback mode.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Select DECO Units ({availablePool.length} questions matching)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DECO_UNITS.map((u) => {
                  const active = selectedUnits.includes(u.unit);
                  const count = PRACTICE_QUESTIONS.filter((q) => q.unit === u.unit).length;
                  return (
                    <button
                      key={u.unit}
                      type="button"
                      onClick={() => toggleUnitSelection(u.unit)}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-semibold">{u.code}</span>
                        <span>{count} Qs</span>
                      </div>
                      <div className="text-xs font-medium mt-0.5">{u.shortTitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="q-count-slider"
                  className="flex justify-between text-xs font-medium text-slate-700 mb-1.5"
                >
                  <span>Number of Questions</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {Math.min(questionCount, availablePool.length)} Qs
                  </span>
                </label>
                <input
                  id="q-count-slider"
                  type="range"
                  min={5}
                  max={Math.max(5, availablePool.length)}
                  step={1}
                  value={Math.min(questionCount, availablePool.length)}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Feedback Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestMode('study')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      testMode === 'study'
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Instant Study
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestMode('timed')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      testMode === 'timed'
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Timed Exam
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {testMode === 'study'
                  ? 'Shows immediate step-by-step explanation after each choice.'
                  : 'Simulates exam conditions; solutions unlock after submission.'}
              </span>
              <button
                type="button"
                onClick={() =>
                  launchTest(
                    selectedUnits,
                    Math.min(questionCount, availablePool.length),
                    testMode,
                    selectedUnits.length === 1
                      ? `Unit ${selectedUnits[0]} Practice Set`
                      : `Custom Units ${selectedUnits.join(', ')} Test`
                  )
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4" />
                <span>Begin Practice</span>
              </button>
            </div>
          </section>
        </div>
      ) : stage === 'active' && currentQuestion ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Question Stage */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="text-xs font-mono text-slate-500">
                {testTitle} · Unit {currentQuestion.unit} · {currentQuestion.co} ·{' '}
                {currentQuestion.btl} · {currentQuestion.sourceTag}
              </div>
              <div className="inline-flex items-center gap-1.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>
                  {testMode === 'timed'
                    ? `${formatClock(remainingSeconds)} left`
                    : `${formatClock(elapsedSeconds)} elapsed`}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                Question {currentQIdx + 1} of {activeQuestions.length} · {currentQuestion.topic}
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </h2>

              <div className="space-y-2.5 pt-1">
                {currentQuestion.options.map((opt, idx) => {
                  const chosen = answers[currentQuestion.id];
                  const isSelected = chosen === idx;
                  const showInstant = testMode === 'study' && chosen !== undefined;
                  const isCorrect = idx === currentQuestion.correctIndex;

                  let btnStyle =
                    'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
                  if (showInstant) {
                    if (isCorrect) {
                      btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                    }
                  } else if (isSelected) {
                    btnStyle = 'border-sky-600 bg-sky-50 text-sky-950';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: idx }))
                      }
                      className={`w-full text-left p-3.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span>{opt}</span>
                      </span>
                      {showInstant && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {showInstant && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {testMode === 'study' && answers[currentQuestion.id] !== undefined && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                  <div className="font-semibold text-slate-900 mb-1">
                    {answers[currentQuestion.id] === currentQuestion.correctIndex
                      ? 'Correct — Solution Walkthrough'
                      : 'Review Explanation'}
                  </div>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                disabled={currentQIdx === 0}
                onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {currentQIdx < activeQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIdx((i) => i + 1)}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 cursor-pointer"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishTest}
                    className="px-5 py-2 rounded-lg bg-sky-600 text-white text-xs sm:text-sm font-medium hover:bg-sky-700 cursor-pointer"
                  >
                    Submit &amp; Score Test
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Question Palette Sidebar */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Question Navigator</h3>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {answeredCount}/{activeQuestions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((q, idx) => {
                const isCurr = idx === currentQIdx;
                const isAns = answers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIdx(idx)}
                    className={`py-2 rounded-lg font-mono tabular-nums text-xs font-semibold border cursor-pointer ${
                      isCurr
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : isAns
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleFinishTest}
                className="w-full py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 cursor-pointer"
              >
                Finish &amp; View Results
              </button>
              <button
                type="button"
                onClick={() => setStage('builder')}
                className="w-full py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Exit to Builder
              </button>
            </div>
          </aside>
        </div>
      ) : (
        /* Review Results Stage */
        lastAttempt && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-mono text-slate-500 uppercase">
                  {lastAttempt.title} · Completed
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  Score:{' '}
                  <span className="font-mono tabular-nums text-sky-700">
                    {lastAttempt.scorePercent}%
                  </span>{' '}
                  <span className="text-lg font-medium text-slate-600 font-mono tabular-nums">
                    ({lastAttempt.correctCount}/{lastAttempt.totalQuestions} correct)
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                  Time: {formatClock(lastAttempt.durationSeconds)} · Saved to Progress Analytics &amp; Schedule Weights
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    launchTest(
                      lastAttempt.units,
                      lastAttempt.totalQuestions,
                      lastAttempt.mode,
                      lastAttempt.title
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Set</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStage('builder')}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 cursor-pointer"
                >
                  New Practice Test
                </button>
              </div>
            </section>

            {/* Per-Unit Breakdown */}
            <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {lastAttempt.units.map((u) => {
                const stat = lastAttempt.perUnit[u];
                if (!stat) return null;
                const pct = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={u} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-mono text-slate-500">UNIT {u}</div>
                    <div className="font-mono tabular-nums text-xl font-semibold text-slate-900 mt-1">
                      {pct}%
                    </div>
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {stat.correct}/{stat.total} correct
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Question-by-question solution breakdown */}
            <section className="space-y-3">
              {activeQuestions.map((q, idx) => {
                const userAns = lastAttempt.answers[q.id];
                const correct = userAns === q.correctIndex;
                return (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-500">
                        Q{idx + 1} · Unit {q.unit} · {q.co} · {q.btl} · {q.topic}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          correct ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {correct ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>{correct ? 'Correct' : 'Needs Review'}</span>
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{q.prompt}</div>
                    <div className="text-xs space-y-1">
                      <div className="text-slate-700">
                        Your Answer:{' '}
                        <span className="font-medium">
                          {userAns !== undefined ? q.options[userAns] : 'Unanswered'}
                        </span>
                      </div>
                      {!correct && (
                        <div className="text-emerald-800 font-medium">
                          Correct Answer: {q.options[q.correctIndex]}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </section>
          </div>
        )
      )}
    </div>
  );
}
