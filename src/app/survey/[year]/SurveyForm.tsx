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
  const [error, setError] = useState<string | null>(null);
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

  const questions = survey.questions;
  const total = questions.length;
  const question = questions[step];

  // ---- persistence --------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(survey.year));
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (saved && typeof saved.seed === 'string' && saved.answers) {
        setSeed(saved.seed);
        setAnswers(saved.answers);
        setStep(Math.min(Math.max(saved.step ?? 0, 0), total - 1));
        setPhase('questions');
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
    if (error) errorRef.current?.focus();
  }, [error]);

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
    setError(null);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setError(null);
      const clamped = Math.min(Math.max(next, 0), total - 1);
      setDirection(clamped >= step ? 1 : -1);
      setStep(clamped);
    },
    [total, step]
  );

  const validateStep = useCallback(() => {
    const message = validateAnswer(question, answers[question.id], countries);
    setError(message);
    return message === null;
  }, [question, answers, countries]);

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
          setError(null);
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
  const masthead = (
    <>
      <p className={styles.kicker}>Survey</p>
      <h1 className="page-title">
        {phase === 'done' ? 'Thank you!' : survey.title}
      </h1>
    </>
  );

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
            <li>{total} questions.</li>
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

  // ---- a question ------------------------------------------------------
  const heading = applyTerm(question.text, term, subject);
  const hintId = question.hint ? `${question.id}-hint` : undefined;
  const errorId = error ? `${question.id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const sending = phase === 'sending';

  return (
    <>
      {masthead}
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
              Exit survey
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
              Privacy policy
            </a>,
            headerEl
          )}
        <Progress
          step={step}
          total={total}
          onBack={step > 0 ? () => goTo(step - 1) : null}
        />

        {error && (
          <div
            className={styles.errorSummary}
            role="alert"
            tabIndex={-1}
            ref={errorRef}
            id={errorId}
          >
            {error}
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
          <QuestionBody
            question={question}
            heading={heading}
            headingRef={headingRef}
            hintId={hintId}
            describedBy={describedBy}
            answer={answers[question.id]}
            seed={seed}
            countries={countries}
            onAnswer={(a) => setAnswer(question.id, a)}
          />
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
          {question.optional && step < total - 1 && (
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
  /** Null on the first question, where there is nowhere to go back to. */
  onBack: (() => void) | null;
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
          Question {step + 1} of {total}
        </p>
      </div>
    </div>
  );
}

function QuestionBody({
  question,
  heading,
  headingRef,
  hintId,
  describedBy,
  answer,
  seed,
  countries,
  onAnswer
}: {
  question: SurveyQuestion;
  heading: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
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
  const title = (
    <h2 className={styles.questionHeading} tabIndex={-1} ref={headingRef}>
      {heading}
    </h2>
  );

  switch (question.kind) {
    case 'single':
    case 'multi': {
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
      const max = multi && question.kind === 'multi' ? question.max : undefined;
      const atLimit = max !== undefined && selected.length >= max;

      return (
        <fieldset className={styles.fieldset} aria-describedby={describedBy}>
          <legend className={styles.legend}>{title}</legend>
          {hint}
          {max !== undefined && (
            <p
              className={`${styles.selectionCount} ${
                atLimit ? styles.selectionCountFull : ''
              }`}
              // polite, so it is announced after whatever the tick
              // itself said rather than interrupting it.
              aria-live="polite"
            >
              {atLimit
                ? `You have chosen ${max}. Untick one to choose another.`
                : `You can choose ${max - selected.length} more.`}
            </p>
          )}
          <div className={styles.options}>
            {options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                name={question.id}
                multi={multi}
                checked={selected.includes(option.id)}
                // Ticking a NEW option once the limit is reached does
                // nothing; unticking always works, so there is always a
                // way out.
                blocked={
                  atLimit && !selected.includes(option.id) ? true : false
                }
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
      const points = [];
      for (let n = LIKERT_MIN; n <= LIKERT_MAX; n++) points.push(String(n));
      return (
        <fieldset className={styles.fieldset} aria-describedby={describedBy}>
          <legend className={styles.legend}>{title}</legend>
          {hint}
          <div className={styles.scale}>
            <span className={styles.scaleEnd}>{question.lowLabel}</span>
            <div className={styles.scalePoints}>
              {points.map((n) => (
                <label
                  key={n}
                  className={styles.scalePoint}
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
                  <span aria-hidden="true">{n}</span>
                  <span className="sr-only">
                    {n} out of {LIKERT_MAX}
                  </span>
                </label>
              ))}
            </div>
            <span className={styles.scaleEnd}>{question.highLabel}</span>
          </div>
        </fieldset>
      );
    }

    case 'country':
      return (
        <>
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
        </>
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
  blocked = false,
  onChange
}: {
  option: SurveyOption;
  name: string;
  multi: boolean;
  checked: boolean;
  /**
   * The selection limit is reached and this option is not one of the
   * chosen ones, so ticking it should do nothing. NOT `disabled` — the
   * control stays focusable and announced, it simply declines.
   */
  blocked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`${styles.option} ${blocked ? styles.optionBlocked : ''}`}
    >
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={name}
        value={option.id}
        checked={checked}
        onChange={(e) => {
          if (blocked && e.target.checked) return;
          onChange(e.target.checked);
        }}
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
