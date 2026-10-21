'use client';

// The questionnaire itself: one question per page, as the GDS service
// manual recommends. Everything it renders is derived from the year's
// definition, so this file should not need touching to run the survey
// again.
//
// Patterns taken from GDS:
//   - one thing per page, with the question as the page's <h1>
//   - the <h1> inside the <legend>, so a screen reader announces the
//     question when it reaches the group rather than reading a heading
//     and a legend separately
//   - hint text above the inputs, never as placeholder text
//   - an error summary that takes focus, with the message repeated at
//     the field
//   - "Continue" rather than "Next" or "Submit"
//   - a Back link above the question, not a browser-history dependency
//
// Answers are kept in localStorage against the survey year, so a
// refresh, a closed tab or a flat battery does not lose someone's
// progress. They are cleared on successful submit.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, DoorOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  applyTerm,
  buildSteps,
  orderedOptions,
  subjectFor,
  termFor
} from '../../../lib/survey';
import type {
  SurveyDefinition,
  SurveyOption,
  SurveyQuestion
} from '../../../lib/survey/types';
import {
  LIKERT_MAX,
  LIKERT_MIN,
  OTHER_MAX_LENGTH
} from '../../../lib/survey/types';
import {
  validateAnswer,
  type Answer,
  type Answers
} from '../../../lib/survey/validate';
import NewsletterForm from '../../../components/NewsletterForm';
import styles from './page.module.scss';

type Phase = 'start' | 'questions' | 'sending' | 'done';

type Saved = { seed: string; answers: Answers; step: number };

function storageKey(year: number) {
  return `hp-survey-${year}`;
}

// Hue for one point on a Likert scale: red at the low end, through
// amber, to green at the high end. The stylesheet builds every colour
// on the point from this one number.
function scaleHue(n: number): number {
  const t = (n - LIKERT_MIN) / (LIKERT_MAX - LIKERT_MIN);
  return Math.round(4 + t * (140 - 4));
}

function newSeed(): string {
  // Only needs to be unguessable enough to decorrelate two respondents'
  // option order; it is not a security token.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function SurveyForm({
  survey,
  countries,
  source
}: {
  survey: SurveyDefinition;
  countries: readonly string[];
  source: string;
}) {
  const [phase, setPhase] = useState<Phase>('start');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [seed, setSeed] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Which way the last move went, so the incoming step animates from
  // the side it came from — forward slides in from the right, Back from
  // the left. Without the direction, going back looks identical to
  // going forward and the animation stops carrying any meaning.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // Honeypot. A real person never fills this in; a naive bot fills every
  // field it finds. Matches the `hp` field the site's other forms use.
  const [honeypot, setHoneypot] = useState('');

  // Steps, not questions: most steps hold one question, but a `group`
  // puts several on the same one — see buildSteps(). Everything below
  // counts, validates and navigates in steps; the questions inside a
  // step are still wholly separate answers.
  const steps = useMemo(() => buildSteps(survey.questions), [survey.questions]);
  const total = steps.length;
  const current = steps[step];
  const groupId = current[0].group;
  const group = groupId ? survey.groups?.[groupId] : undefined;

  // ---- persistence --------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(survey.year));
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (saved && typeof saved.seed === 'string' && saved.answers) {
        const restored = Math.min(Math.max(saved.step ?? 0, 0), total - 1);
        setSeed(saved.seed);
        setAnswers(saved.answers);
        setStep(restored);
        setPhase('questions');
        // The history entry has to describe where the session actually
        // resumed, not where a cold load would have started. Without
        // this the bottom entry said "start screen" while the page was
        // showing question 18, so one Back jumped the whole survey.
        try {
          window.history.replaceState(
            { hpSurvey: { phase: 'questions', step: restored } },
            ''
          );
        } catch {
          // See pushHistory.
        }
      }
    } catch {
      // A corrupt or unreadable entry is not worth failing over — the
      // respondent just starts fresh.
    }
  }, [survey.year, total]);

  // TEMPORARY, DEV ONLY — like devReset below. `?preview=thanks` opens
  // straight on the thank-you screen, so it can be designed without
  // submitting a response, and it survives the reloads that editing
  // this file causes. Declared after the persistence effect so it wins
  // over a saved session. Dead code in a production build.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'thanks') setPhase('done');
  }, []);

  // The entry for however this page first appeared. replaceState, not
  // push: it describes the load itself rather than a move away from it.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || phase === 'sending') return;
    seeded.current = true;
    // A restored session has already written its own entry, and it
    // knows the step; this one would overwrite it with the cold-load
    // default.
    if ((window.history.state as { hpSurvey?: unknown } | null)?.hpSurvey) {
      return;
    }
    try {
      window.history.replaceState(
        {
          hpSurvey: { phase: phase === 'start' ? 'start' : 'questions', step }
        },
        ''
      );
    } catch {
      // See pushHistory.
    }
  }, [phase, step]);

  useEffect(() => {
    if (phase !== 'questions' || !seed) return;
    try {
      window.localStorage.setItem(
        storageKey(survey.year),
        JSON.stringify({ seed, answers, step } satisfies Saved)
      );
    } catch {
      // Private browsing, or storage full. Answers stay in memory.
    }
  }, [phase, seed, answers, step, survey.year]);

  // The site header lives in the root layout, outside this component's
  // tree, so the exit link is portalled into it. That makes it a real
  // grid item beside the logo rather than something floated on top and
  // kept in place by guesswork — and it lands in the header's reading
  // order for a screen reader too.
  //
  // Null outside the question steps, so it only exists while there is
  // something to exit from.
  const [headerEl, setHeaderEl] = useState<Element | null>(null);
  useEffect(() => {
    setHeaderEl(
      phase === 'questions' ? document.querySelector('.site-header') : null
    );
  }, [phase]);

  // Strip the site chrome while someone is answering — see
  // `body.survey-focus` in globals.css. Only the question steps: the
  // landing screen and the thank-you page keep the full navigation,
  // because at those two moments going elsewhere is a reasonable thing
  // to want.
  //
  // The cleanup matters more than it looks. Without it, navigating away
  // mid-survey would leave the class on the body and the next page
  // would render with no navigation at all.
  useEffect(() => {
    const focused = phase === 'questions';
    document.body.classList.toggle('survey-focus', focused);
    return () => document.body.classList.remove('survey-focus');
  }, [phase]);

  // On each step: back to the top of the page, and move focus to the new
  // question so a screen reader announces it. Without the focus move,
  // changing step silently swaps the content and leaves focus wherever
  // the last click was.
  //
  // `preventScroll` matters — focusing an element scrolls it into view
  // by default, which would drag the page back down and undo the
  // scrollTo below.
  useEffect(() => {
    if (phase !== 'questions') return;
    headingRef.current?.focus({ preventScroll: true });
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [step, phase]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorRef.current?.focus();
  }, [errors]);

  // Apply a popped entry, and seed one for however the page was first
  // rendered — a restored session opens mid-survey, and without an
  // entry describing that there would be nothing to come back to.
  useEffect(() => {
    function onPop(event: PopStateEvent) {
      const state = (
        event.state as { hpSurvey?: { phase: Phase; step: number } } | null
      )?.hpSurvey;
      // No entry of ours: an older entry from before this page, which
      // the browser is navigating to on its own. Leave it alone.
      if (!state) return;
      fromPopState.current = true;
      setErrors({});
      // 'sending' and 'done' are not navigable — a submitted response
      // cannot be un-submitted, so Back out of the thank-you page goes
      // to the questions, never back into the middle of a form whose
      // answers have already gone.
      setPhase(state.phase === 'start' ? 'start' : 'questions');
      setDirection(-1);
      setStep(Math.min(Math.max(state.step, 0), total - 1));
      // Cleared after React has applied the above, so the pushes those
      // setters would otherwise trigger are suppressed.
      window.setTimeout(() => {
        fromPopState.current = false;
      }, 0);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [total]);

  const term = useMemo(
    () => termFor(survey, flatten(answers)),
    [survey, answers]
  );
  // The subject form, for the questions that open on the role rather
  // than referring to it mid-sentence. Same answer, different word for
  // the handful of roles where one noun cannot do both jobs.
  const subject = useMemo(
    () => subjectFor(survey, flatten(answers)),
    [survey, answers]
  );

  const setAnswer = useCallback((id: string, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
    // Clear only THIS question's error. On a grouped step the others
    // are still wrong, and wiping the whole summary because one field
    // was touched would hide them.
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ---- browser Back -------------------------------------------------
  //
  // The survey is one URL, so without this the browser's Back button
  // left the site from question 17 — the single most jarring thing a
  // long form can do, and the reason people distrust multi-step forms
  // in the first place.
  //
  // So each move pushes a history entry describing where it went, and
  // popstate puts that back. The URL never changes: a fragment per
  // question would be shareable but would also invite someone to open
  // /survey/2026#question-14 cold, with no answers and no way to make
  // sense of it.
  //
  // `fromPopState` stops the loop. Applying a popped entry sets state
  // the same way a click does, and without the guard that would push a
  // fresh entry for a move the user made by going backwards.
  const fromPopState = useRef(false);

  const pushHistory = useCallback((next: { phase: Phase; step: number }) => {
    if (fromPopState.current) return;
    try {
      window.history.pushState({ hpSurvey: next }, '');
    } catch {
      // History is unavailable (rare, but a sandboxed iframe will do
      // it). Navigation still works, Back just behaves as before.
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setErrors({});
      const clamped = Math.min(Math.max(next, 0), total - 1);
      setDirection(clamped >= step ? 1 : -1);
      setStep(clamped);
      pushHistory({ phase: 'questions', step: clamped });
    },
    [total, step, pushHistory]
  );

  // Back from the first step lands on the survey's own opening screen
  // rather than doing nothing. It is a real place — the intro, the
  // prize draw and the privacy notice live there — so "back" from
  // question one should reach it, and the browser's own Back button
  // does the same thing by the same route.
  const goBack = useCallback(() => {
    if (step > 0) {
      goTo(step - 1);
      return;
    }
    setErrors({});
    setPhase('start');
    pushHistory({ phase: 'start', step: 0 });
  }, [step, goTo, pushHistory]);

  // Keyed by question id, because a grouped step can fail in more than
  // one place at once and "fix one, discover the next" is a miserable
  // way through a form. Every question on the step is checked on each
  // Continue, so the summary always lists everything outstanding.
  const validateStep = useCallback(() => {
    const found: Record<string, string> = {};
    for (const q of current) {
      const message = validateAnswer(
        q,
        answers[q.id],
        countries,
        applyTerm(q.text, term, subject)
      );
      if (message) found[q.id] = message;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }, [current, answers, countries, term, subject]);

  const onContinue = useCallback(() => {
    if (!validateStep()) return;
    if (step === total - 1) {
      void submit();
      return;
    }
    goTo(step + 1);
    // submit is stable for the life of the component; see below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateStep, step, total, goTo]);

  async function submit() {
    setPhase('sending');
    setSubmitError(null);
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          year: survey.year,
          answers,
          source,
          hp: honeypot
        })
      });
      // The route still returns a `token`, and the response row still
      // carries one as its dedupe key — the client just has no use for
      // it now that nothing is attached to a response after the fact.
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setPhase('questions');
        setSubmitError(
          body.error ?? 'Something went wrong. Please try again in a moment.'
        );
        return;
      }
      try {
        window.localStorage.removeItem(storageKey(survey.year));
      } catch {
        // Nothing to do; the answers are already safely stored.
      }
      setPhase('done');
    } catch {
      setPhase('questions');
      setSubmitError('We could not reach the server. Please try again.');
    }
  }

  // TEMPORARY, DEV ONLY — remove when the survey goes live.
  //
  // Walking the survey while building it means clearing localStorage by
  // hand every time. `process.env.NODE_ENV` is inlined at build time, so
  // in a production build this whole branch is dead code and the button
  // is not in the bundle at all — it cannot leak to real respondents.
  const devReset =
    process.env.NODE_ENV === 'production' ? null : (
      <button
        type="button"
        className={styles.devReset}
        onClick={() => {
          try {
            window.localStorage.removeItem(storageKey(survey.year));
          } catch {
            // Nothing stored; resetting state below is enough.
          }
          setAnswers({});
          setStep(0);
          setSeed('');
          setErrors({});
          setSubmitError(null);
          setPhase('start');
        }}
      >
        ↺ Start over (dev only)
      </button>
    );

  // The kicker and page title. Rendered here rather than in page.tsx so
  // the title can become "Thank you!" once the answers are in. The
  // site-wide page-title treatment: Instrument Serif at the article-title
  // size, left aligned — the same class /conduct, /privacy, /events and
  // the job permalinks use, so the survey leads the way every page does.
  // The masthead takes an optional Back control, shown beside the title
  // on wide screens — see .titleRow. Only the question steps pass one:
  // there is nowhere to go back to from the start screen, and the
  // thank-you page is past the point of going back at all.
  const mastheadWith = (back?: ReactNode) => (
    <>
      <p className={styles.kicker}>Survey</p>
      <div className={styles.titleRow}>
        {back}
        <h1 className="page-title">
          {phase === 'done' ? 'Thank you!' : survey.title}
        </h1>
      </div>
    </>
  );
  const masthead = mastheadWith();

  // ---- start ---------------------------------------------------------
  if (phase === 'start') {
    return (
      <>
        {masthead}
        <div className={styles.startPanel}>
          {/* First child so the float has content to wrap. alt="" because
            it is decoration — naming it would make a screen reader
            announce an illustration that adds nothing to the words. */}
          <Image
            src="/images/content/image-explore.svg"
            alt=""
            width={288}
            height={318}
            className={styles.startImage}
            priority
          />
          <p className="intro">{survey.intro}</p>
          {/* What taking part involves — kept short, so the button is
            reachable without reading a privacy notice first. */}
          <h2 className="section-label">Before you start</h2>
          <ul className={styles.startFacts}>
            {/* Questions, not steps. `total` is the step count now that
              some steps hold several questions, and "21 questions"
              would be a straightforwardly wrong promise. */}
            <li>{survey.questions.length} questions.</li>
            <li>
              Your progress is saved in this browser, so you can stop and come
              back.
            </li>
          </ul>
          <button
            type="button"
            className="black-button black-button--large"
            onClick={() => {
              // Only on a genuinely fresh start. Re-entering after Exit
              // keeps the existing seed, so the shuffled questions come
              // back in the order that respondent already saw.
              if (!seed) setSeed(newSeed());
              setPhase('questions');
              // An entry for the questions, so Back from step 1 comes
              // straight back here.
              pushHistory({ phase: 'questions', step });
            }}
          >
            {/* The <span> is what the global `.black-button > span` rule
              slides right on hover. aria-hidden so the arrow is
              decoration, not something a screen reader reads out. */}
            Start the survey <span aria-hidden="true">→</span>
          </button>

          <PrizeDraw survey={survey} as="h2" large>
            <p>
              Finish the survey, then join the Hard Problems newsletter, and you
              could be one of {PRIZE.copies} people we send a copy of{' '}
              <em>{PRIZE.title}</em> by {PRIZE.authors}.{' '}
              <Link href={PRIZE.review}>Read our review of the book</Link>.
            </p>
          </PrizeDraw>

          {/* Below the button on purpose. It is still read before anyone
            answers anything, but it no longer stands between someone and
            starting. A direct child of the panel like everything else —
            the <section> wrapper it used to have put it in a container
            of its own for no benefit. */}
          <h2 className={`section-label ${styles.privacyHeading}`}>
            Your privacy
          </h2>
          <ul className={styles.startFacts}>
            <li>
              Your answers are anonymous. We do not ask who you are, and we do
              not record your IP address.
            </li>
            <li>
              We never ask for your email address. The survey stores no way of
              telling who sent an answer.
            </li>
            <li>
              To get the results, join our newsletter at the end. That is an
              ordinary newsletter signup, kept entirely separate from the
              survey, and it is not linked to what you answered.
            </li>
          </ul>
          <p className={styles.privacyLine}>
            See our <Link href="/privacy">privacy notice</Link> for how we
            handle this data and how to ask us to delete it.
          </p>
        </div>
      </>
    );
  }

  // ---- done ----------------------------------------------------------
  if (phase === 'done') {
    return (
      <>
        {/* First, so it floats top right from the very top of the
            screen, level with the title. */}
        <aside className={styles.donePrize}>
          <PrizeDraw
            survey={survey}
            as="h2"
            imageSizes="(max-width: 600px) calc(100vw - 72px), 218px"
          >
            <p>
              Newsletter subscribers will be entered into a draw for one of{' '}
              {PRIZE.copies} copies of <em>{PRIZE.title}</em> by {PRIZE.authors}
              . <Link href={PRIZE.review}>Read our review of the book</Link>.
            </p>
          </PrizeDraw>
        </aside>
        {masthead}
        <ThankYou survey={survey} />
        {devReset}
      </>
    );
  }

  // ---- a step ----------------------------------------------------------
  const errorList = current
    .map((q) => ({ id: q.id, message: errors[q.id] }))
    .filter((e): e is { id: string; message: string } => Boolean(e.message));
  const sending = phase === 'sending';
  // Only a single-question step can be optional — a group has no one
  // thing to skip, and none of the grouped questions are optional.
  const skippable = current.length === 1 && current[0].optional;

  return (
    <>
      {mastheadWith(
        <button
          type="button"
          className={`black-button black-button--small ${styles.titleBack}`}
          onClick={goBack}
        >
          <span aria-hidden="true">←</span> Back
        </button>
      )}
      <div className={styles.step}>
        {headerEl &&
          createPortal(
            // A plain class, not a module one: globals.css places it in
            // the header grid, and a hashed name could not be targeted
            // from there.
            //
            // Back to the survey's own first screen rather than off the
            // site — "exit" here means step out of the questionnaire, and
            // the answers stay saved in this browser, so Start picks up
            // where they left off.
            <button
              type="button"
              className="survey-exit"
              onClick={() => setPhase('start')}
            >
              {/* aria-hidden: the word beside it already says what this
                does, so announcing the icon would just repeat it. */}
              <DoorOpen className="survey-exit-icon" aria-hidden="true" />
              {/* The second word goes on a phone, along with the icon —
                  see globals.css. Marked up rather than swapped in JS,
                  so the server and the client render the same thing. */}
              Exit<span className="survey-word-long"> survey</span>
            </button>,
            headerEl
          )}
        {headerEl &&
          createPortal(
            // Top right, mirroring Exit. A new tab on purpose: this is
            // the one thing someone part-way through a form may
            // reasonably want to read, and navigating away to read it
            // would drop them out of the questionnaire.
            <a
              className="survey-privacy"
              href="/privacy"
              target="_blank"
              rel="noopener"
            >
              Privacy<span className="survey-word-long"> policy</span>
            </a>,
            headerEl
          )}
        <Progress step={step} total={total} onBack={goBack} />

        {errorList.length > 0 && (
          <div
            className={styles.errorSummary}
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {/* One message reads as a sentence; several need to be a
                list, and each carries the id its field points at with
                aria-describedby. */}
            {errorList.length === 1 ? (
              <span id={`${errorList[0].id}-error`}>
                {errorList[0].message}
              </span>
            ) : (
              <ul className={styles.errorList}>
                {errorList.map((e) => (
                  <li key={e.id} id={`${e.id}-error`}>
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* `key` is what restarts the animation: without it React reuses
          the same DOM node between steps and a CSS animation only runs
          once per mount. */}
        <div
          key={step}
          className={`${styles.stepBody} ${
            direction === -1 ? styles.stepBodyBack : ''
          }`}
        >
          {/* A grouped step gets one heading of its own, and each
              question below it drops to a sub-heading. A single-question
              step is unchanged: the question IS the heading. */}
          {group && (
            <>
              <h2
                className={styles.questionHeading}
                tabIndex={-1}
                ref={headingRef}
              >
                {group.title}
              </h2>
              {group.hint && <p className={styles.hint}>{group.hint}</p>}
            </>
          )}
          {current.map((q, i) => (
            <QuestionBody
              key={q.id}
              question={q}
              heading={applyTerm(q.text, term, subject)}
              // Focus goes to the step's heading, which is the group's
              // when there is one — so only an ungrouped question takes
              // the ref.
              headingRef={group ? undefined : headingRef}
              inGroup={Boolean(group)}
              hintId={q.hint ? `${q.id}-hint` : undefined}
              describedBy={
                [
                  q.hint ? `${q.id}-hint` : null,
                  errors[q.id] ? `${q.id}-error` : null
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              answer={answers[q.id]}
              seed={seed}
              countries={countries}
              onAnswer={(a) => setAnswer(q.id, a)}
              first={i === 0}
            />
          ))}
        </div>

        {/* Honeypot — visually hidden, never announced, never tabbable. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="hp-field">Leave this field empty</label>
          <input
            id="hp-field"
            type="text"
            name="hp"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {submitError && (
          <p className={styles.errorSummary} role="alert">
            {submitError}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className="black-button"
            onClick={onContinue}
            disabled={sending}
          >
            {sending ? (
              'Sending…'
            ) : (
              <>
                {step === total - 1 ? 'Finish and send' : 'Continue'}{' '}
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
          {skippable && step < total - 1 && (
            <button
              type="button"
              className={styles.skipLink}
              onClick={() => goTo(step + 1)}
            >
              Skip this question
            </button>
          )}
        </div>

        {devReset}
      </div>
    </>
  );
}

// `termFor` wants the raw values, not the Answer wrappers.
function flatten(answers: Answers): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers)) out[k] = v.value;
  return out;
}

function Progress({
  step,
  total,
  onBack
}: {
  step: number;
  total: number;
  /**
   * Always present. On the first step it goes to the survey's opening
   * screen rather than nowhere — that screen holds the intro, the
   * prize draw and the privacy notice, so it is somewhere worth being
   * able to get back to.
   */
  onBack: () => void;
}) {
  const done = step; // questions completed, not counting the current one
  const pct = Math.round((done / total) * 100);
  return (
    <div className={styles.progress}>
      {/* The bar is decorative — the count below it is the accessible
          version, so this is hidden rather than announced twice. */}
      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.progressRow}>
        {/* An empty span on question 1 rather than nothing, so
            space-between still pushes the count to the right edge
            instead of letting it slide left. */}
        {onBack ? (
          <button type="button" className={styles.backLink} onClick={onBack}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        <p className={styles.progressLabel}>
          Step {step + 1} of {total}
        </p>
      </div>
    </div>
  );
}

function QuestionBody({
  question,
  heading,
  headingRef,
  inGroup,
  first,
  hintId,
  describedBy,
  answer,
  seed,
  countries,
  onAnswer
}: {
  question: SurveyQuestion;
  heading: string;
  /** Absent on a grouped step, where the group's heading takes focus. */
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  /** Render the question as a sub-heading under a group's heading. */
  inGroup?: boolean;
  /** First question on the step, so it does not need a top margin. */
  first?: boolean;
  hintId?: string;
  describedBy?: string;
  answer: Answer | undefined;
  seed: string;
  countries: readonly string[];
  onAnswer: (a: Answer) => void;
}) {
  const hint = question.hint ? (
    <p className={styles.hint} id={hintId}>
      {question.hint}
    </p>
  ) : null;

  // <h2>, not <h1>, even though GDS puts the question in the page
  // heading. That guidance assumes one question per PAGE, where the
  // question is the only thing the page is about. Here the survey's
  // title is already the <h1> above the form, so making the question an
  // <h1> too would put two on the page and leave a screen-reader user
  // with a flat, ambiguous outline. It is styled as the dominant
  // heading and still takes focus on each step, which is what the
  // guidance is actually for.
  const title = inGroup ? (
    // Under a group heading the question is no longer what the step is
    // about, so it steps down a level and gives up focus and the
    // dominant size — otherwise five of them would compete with the
    // one heading above and with each other.
    <h3 className={`${styles.groupQuestion} ${first ? styles.groupFirst : ''}`}>
      {heading}
    </h3>
  ) : (
    <h2 className={styles.questionHeading} tabIndex={-1} ref={headingRef}>
      {heading}
    </h2>
  );

  switch (question.kind) {
    case 'single':
    case 'multi': {
      // A single-choice question asked as a dropdown. Same answer and
      // same validation as the radio version — only the control
      // differs, so nothing downstream knows about this.
      //
      // Not a fieldset: one <select> is one control with one label, and
      // wrapping a single control in a group is noise for a screen
      // reader. The visible heading is repeated as an sr-only <label>
      // for the same reason the country picker does it — a heading is
      // not an accessible name.
      if (question.kind === 'single' && question.as === 'select') {
        const chosen = typeof answer?.value === 'string' ? answer.value : '';
        const selectOptions = orderedOptions(question, seed);
        const other = selectOptions.find((o) => o.isOther);
        return (
          <div
            className={`${styles.selectField} ${
              inGroup ? styles.selectFieldGrouped : ''
            }`}
          >
            {title}
            {hint}
            <label className="sr-only" htmlFor={question.id}>
              {heading}
            </label>
            <select
              id={question.id}
              className={styles.select}
              aria-describedby={describedBy}
              value={chosen}
              onChange={(e) =>
                onAnswer({
                  value: e.target.value,
                  otherText: answer?.otherText
                })
              }
            >
              <option value="">Choose one</option>
              {selectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {other && chosen === other.id && (
              <div className={styles.otherWrap}>
                <label
                  className={styles.label}
                  htmlFor={`${question.id}-other`}
                >
                  Please say more
                </label>
                <input
                  id={`${question.id}-other`}
                  className={styles.input}
                  type="text"
                  maxLength={OTHER_MAX_LENGTH}
                  value={answer?.otherText ?? ''}
                  onChange={(e) =>
                    onAnswer({ value: chosen, otherText: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        );
      }

      const options = orderedOptions(question, seed);
      const multi = question.kind === 'multi';
      const selected: string[] = multi
        ? Array.isArray(answer?.value)
          ? (answer.value as string[])
          : []
        : typeof answer?.value === 'string'
          ? [answer.value as string]
          : [];
      const otherOption = options.find((o) => o.isOther);
      const otherChosen = otherOption
        ? selected.includes(otherOption.id)
        : false;

      // "Choose up to three" questions get a live count, and a tick past
      // the limit is refused rather than accepted and rejected a click
      // later at Continue.
      //
      // The counter is what makes the refusal fair: it has been saying
      // how many are left the whole time, so reaching the limit is not a
      // surprise. Disabling the remaining boxes would be the obvious
      // alternative and is worse — disabled controls leave the tab order
      // and carry no explanation, so a keyboard or screen reader user
      // just finds options that have quietly disappeared.
      // Yes/No side by side rather than stacked. Detected from the
      // options rather than flagged in the definition, so any question
      // that is genuinely a yes/no gets it without anyone remembering
      // to say so — and a question that stops being one loses it.
      const yesNo =
        question.kind === 'single' &&
        options.length === 2 &&
        options.every((o) => o.id === 'yes' || o.id === 'no');

      return (
        <fieldset
          className={`${styles.fieldset} ${inGroup ? styles.groupFieldset : ''}`}
          aria-describedby={describedBy}
        >
          <legend className={styles.legend}>{title}</legend>
          {hint}
          <div
            className={`${styles.options} ${yesNo ? styles.optionsInline : ''}`}
          >
            {options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                name={question.id}
                multi={multi}
                checked={selected.includes(option.id)}
                onChange={(checked) => {
                  const next = multi
                    ? checked
                      ? [...selected, option.id]
                      : selected.filter((id) => id !== option.id)
                    : [option.id];
                  onAnswer({
                    value: multi ? next : option.id,
                    otherText: answer?.otherText
                  });
                }}
              />
            ))}
          </div>
          {otherChosen && otherOption && (
            <div className={styles.otherWrap}>
              <label className={styles.label} htmlFor={`${question.id}-other`}>
                Please say more
              </label>
              <input
                id={`${question.id}-other`}
                className={styles.input}
                type="text"
                maxLength={OTHER_MAX_LENGTH}
                value={answer?.otherText ?? ''}
                onChange={(e) =>
                  onAnswer({
                    value: answer?.value ?? (multi ? selected : otherOption.id),
                    otherText: e.target.value
                  })
                }
              />
            </div>
          )}
        </fieldset>
      );
    }

    case 'likert': {
      // Every point named, and no numbers shown. The stored value is
      // still the number — 0-5 is what makes these comparable across
      // questions and across years — but a respondent should be
      // choosing a description, not translating their feeling into a
      // digit and hoping we read it the same way.
      //
      // Vertical, for the same reason: six labels will not fit across
      // a reading column, and the row of numbered circles only worked
      // because "3" is one character wide.
      return (
        <fieldset className={styles.fieldset} aria-describedby={describedBy}>
          <legend className={styles.legend}>{title}</legend>
          {hint}
          <div className={styles.scale}>
            {question.labels.map((label, i) => {
              const n = String(LIKERT_MIN + i);
              return (
                <label
                  key={n}
                  className={styles.scalePoint}
                  // The low-to-high colour run survives the change to a
                  // list: it is the radio's own accent now rather than
                  // a filled circle, so the scale still reads as a
                  // scale at a glance.
                  style={
                    { '--scale-hue': scaleHue(Number(n)) } as CSSProperties
                  }
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={n}
                    checked={answer?.value === n}
                    onChange={() => onAnswer({ value: n })}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    case 'country':
      // Same .selectField wrapper as the `as: 'select'` branch above,
      // and for its sake rather than this one's: that class is what
      // pulls a dropdown up under its label inside a grouped step.
      // Without it this question alone kept the default 1.25rem gap
      // and sat visibly looser than the three dropdowns around it.
      return (
        <div
          className={`${styles.selectField} ${
            inGroup ? styles.selectFieldGrouped : ''
          }`}
        >
          {title}
          {hint}
          <label className="sr-only" htmlFor={question.id}>
            {heading}
          </label>
          <select
            id={question.id}
            className={styles.select}
            aria-describedby={describedBy}
            value={typeof answer?.value === 'string' ? answer.value : ''}
            onChange={(e) => onAnswer({ value: e.target.value })}
          >
            <option value="">Choose a country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      );

    case 'text':
      return (
        <>
          {title}
          {hint}
          <input
            id={question.id}
            className={styles.input}
            type="text"
            maxLength={question.maxLength}
            aria-describedby={describedBy}
            value={typeof answer?.value === 'string' ? answer.value : ''}
            onChange={(e) => onAnswer({ value: e.target.value })}
          />
          <CharCount
            used={String(answer?.value ?? '').length}
            max={question.maxLength}
          />
        </>
      );

    case 'textarea':
      return (
        <>
          {title}
          {hint}
          <textarea
            id={question.id}
            className={styles.textarea}
            rows={6}
            maxLength={question.maxLength}
            aria-describedby={describedBy}
            value={typeof answer?.value === 'string' ? answer.value : ''}
            onChange={(e) => onAnswer({ value: e.target.value })}
          />
          <CharCount
            used={String(answer?.value ?? '').length}
            max={question.maxLength}
          />
        </>
      );
  }
}

function OptionRow({
  option,
  name,
  multi,
  checked,
  onChange
}: {
  option: SurveyOption;
  name: string;
  multi: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.option}>
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={name}
        value={option.id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{option.label}</span>
    </label>
  );
}

function CharCount({ used, max }: { used: number; max: number }) {
  const left = max - used;
  return (
    <p className={styles.charCount} aria-live="polite">
      {left} character{left === 1 ? '' : 's'} remaining
    </p>
  );
}

// ---- the prize draw --------------------------------------------------
//
// An incentive to finish, shown on the landing screen and again on the
// thank-you page. Both places render the same component so the offer
// and its terms cannot drift apart.
//
// IMPORTANT, and the reason the terms below are worded the way they
// are: the survey is anonymous by design — no email address is stored
// with the answers — so there is no way to check that an entrant
// actually completed it. Entry is therefore subscribing to the
// newsletter within the survey window; finishing the survey is asked
// for, and said to be unverified, rather than promised as a condition
// we enforce. Making it enforceable would mean attaching an identity
// to every response, which is the thing the survey promises not to do.

const PRIZE = {
  copies: 20,
  title: 'Why Design Is Hard',
  authors: 'Scott Berkun and Bryan Zug',
  review: '/articles/why-design-is-hard',
  image: '/images/content/illustration-book-why-design-is-hard-inline.jpg',
  imageWidth: 1246,
  imageHeight: 1546
} as const;

/**
 * The last day anyone can answer, and so the closing date of the draw.
 *
 * `closesAt` is exclusive, hence the day's subtraction — the same
 * arithmetic the closed notice on the page does. Locale and time zone
 * are both pinned so the server and the client render the same string
 * and hydration does not complain. `short` gives "30 Nov 2026" for
 * the card's summary line; the terms keep the month in full.
 */
function closingDateLabel(closesAt: string, short = false): string {
  const d = new Date(closesAt);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function PrizeDraw({
  survey,
  as: Heading,
  large = false,
  imageSizes,
  children
}: {
  survey: SurveyDefinition;
  /** h2 on both screens; h3 kept for a card nested under an h2. */
  as: 'h2' | 'h3';
  /** A bigger cover on the landing screen, where the prize is a reason
   *  to start; on the thank-you page it is a reminder. */
  large?: boolean;
  /** Overrides the image's `sizes` hint where CSS sets another width. */
  imageSizes?: string;
  children: ReactNode;
}) {
  const closes = closingDateLabel(survey.closesAt);
  const closesShort = closingDateLabel(survey.closesAt, true);

  return (
    // A div, not a <section>: the site-wide `.container section` rule
    // adds 42px/84px padding on wide screens and outranks `.prize`. An
    // unlabelled section is not a landmark anyway, so nothing is lost.
    <div className={styles.prize}>
      {/* A real alt, not alt="": the cover is what is on offer, so it
          carries information rather than decorating the words. */}
      <Image
        src={PRIZE.image}
        alt={`Cover of ${PRIZE.title} by ${PRIZE.authors}`}
        width={PRIZE.imageWidth}
        height={PRIZE.imageHeight}
        className={`${styles.prizeImage} ${
          large ? styles.prizeImageLarge : ''
        }`}
        sizes={
          imageSizes ??
          (large
            ? '(max-width: 600px) 136px, 210px'
            : '(max-width: 600px) 104px, 148px')
        }
      />
      <div className={styles.prizeBody}>
        <Heading className={styles.prizeHeading}>Win a free book</Heading>
        {children}
        <p className={styles.prizeNote}>
          We will draw {PRIZE.copies} newsletter subscribers randomly after the
          survey closes on {closesShort}.
        </p>
        {/* A disclosure rather than a separate page: the terms are
            short, and a prize draw's terms should be readable where
            the prize is offered rather than one click away. */}
        <details className={styles.prizeTerms}>
          <summary>Prize draw terms</summary>
          <ol>
            <li>
              The promoter is Hard Problems, a nonprofit company limited by
              guarantee registered in England and Wales, company number
              16028166.
            </li>
            <li>No purchase is necessary. Entry is free.</li>
            <li>
              The draw is open to anyone aged 18 or over, except our directors,
              staff and contractors and their immediate families. It is void
              where prohibited by local law.
            </li>
            <li>
              To enter, subscribe to the Hard Problems newsletter on or before{' '}
              {closes}. We ask that you complete the survey first, but because
              survey responses are anonymous we cannot check whether you have,
              and we do not. Existing subscribers on that date are entered
              automatically. One entry per person.
            </li>
            <li>
              There are {PRIZE.copies} prizes. Each is one copy of{' '}
              <em>{PRIZE.title}</em> by {PRIZE.authors}. There is no cash
              alternative and prizes are not transferable.
            </li>
            <li>
              Winners are selected at random from all eligible entries within 14
              days of the closing date, and contacted at the email address they
              subscribed with.
            </li>
            <li>
              A winner has 28 days to reply with a postal address. If they do
              not, we draw a replacement.
            </li>
            <li>
              We post prizes worldwide at our own cost. Any import duty or local
              tax is the winner&rsquo;s responsibility.
            </li>
            <li>
              We use a winner&rsquo;s email and postal address only to send the
              prize, and delete the postal address once it has been sent. See
              our <Link href="/privacy">privacy notice</Link>.
            </li>
            <li>
              The draw is not sponsored, endorsed or administered by{' '}
              {PRIZE.authors} or their publisher.
            </li>
            <li>
              Entering means accepting these terms. The draw is governed by the
              law of England and Wales.
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}

function ThankYou({ survey }: { survey: SurveyDefinition }) {
  const shareUrl = `https://www.hardproblems.com/survey/${survey.year}?source=share`;
  // The title already starts with "The", so drop it to avoid "the The".
  const shareText = `I took the ${survey.title.replace(/^The /, '')} survey and you should too! ${shareUrl} Please re-share.`;
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.thankYou}>
      <p>Your answers are in.</p>
      <p>We aim to publish the report in Dec 2026.</p>

      {/* There is deliberately no email field here any more. Asking for
          an address at the end meant a second list, a second consent
          record and a second route into the newsletter with its own
          handling. The site already has one subscribe form, with the
          double opt-in that goes with it, so this points at that
          instead — which also means nothing on this page can be joined
          back to the answers just submitted. */}
      <h2 className={styles.thankYouHeading}>Get the results</h2>
      <p>
        We did not ask for your email, so your answers stay anonymous. To hear
        when the report is published, join our{' '}
        <Link href="/newsletter">newsletter</Link>.
      </p>

      <div className={styles.newsletterBox}>
        <NewsletterForm hideLabel />
      </div>

      <h2 className={styles.thankYouHeading}>Help us reach more people</h2>
      <p>
        Please share this link on social media. The more people who answer this
        survey, the better the report.
      </p>
      <div className={styles.shareBox}>
        <p className={styles.shareText}>{shareText}</p>
        <button
          type="button"
          className="black-button black-button--small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareText);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 3000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {/* Swaps to a tick with the label, so the change is visible
              without reading the words. */}
          {copied ? (
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>
    </div>
  );
}
