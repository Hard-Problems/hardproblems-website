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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { applyTerm, orderedOptions, termFor } from '../../../lib/survey';
import type {
  SurveyDefinition,
  SurveyOption,
  SurveyQuestion
} from '../../../lib/survey/types';
import {
  advancesOnSelect,
  LIKERT_MAX,
  LIKERT_MIN,
  OTHER_MAX_LENGTH
} from '../../../lib/survey/types';
import {
  validateAnswer,
  type Answer,
  type Answers
} from '../../../lib/survey/validate';
import styles from './page.module.scss';

type Phase = 'start' | 'questions' | 'sending' | 'done';

type Saved = { seed: string; answers: Answers; step: number };

function storageKey(year: number) {
  return `hp-survey-${year}`;
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
  const [responseToken, setResponseToken] = useState('');

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

  // Move focus to the new question so a screen reader announces it.
  // Without this, changing step silently swaps the content and leaves
  // focus wherever the last click was.
  useEffect(() => {
    if (phase === 'questions') headingRef.current?.focus();
  }, [step, phase]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const term = useMemo(
    () => termFor(survey, flatten(answers)),
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
      const body = (await res.json()) as {
        ok: boolean;
        token?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setPhase('questions');
        setSubmitError(
          body.error ?? 'Something went wrong. Please try again in a moment.'
        );
        return;
      }
      setResponseToken(body.token ?? '');
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
          setResponseToken('');
          setPhase('start');
        }}
      >
        ↺ Start over (dev only)
      </button>
    );

  // ---- start ---------------------------------------------------------
  if (phase === 'start') {
    return (
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
        <h2 className="section-label">Before you start</h2>
        <ul className={styles.startFacts}>
          <li>{total} questions, about five minutes.</li>
          <li>
            Your answers are anonymous. We do not ask who you are, and we do not
            record your IP address.
          </li>
          <li>
            Your progress is saved in this browser, so you can stop and come
            back.
          </li>
          <li>
            At the end you can optionally give us an email address to receive
            the results. That is the only point at which anything identifies
            you, and it is stored separately from your answers.
          </li>
        </ul>
        <p className={styles.privacyLine}>
          See our <Link href="/privacy">privacy notice</Link> for how we handle
          this data and how to ask us to delete it.
        </p>
        <button
          type="button"
          className="black-button black-button--large"
          onClick={() => {
            setSeed(newSeed());
            setPhase('questions');
          }}
        >
          {/* The <span> is what the global `.black-button > span` rule
              slides right on hover. aria-hidden so the arrow is
              decoration, not something a screen reader reads out. */}
          Start the survey <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  // ---- done ----------------------------------------------------------
  if (phase === 'done') {
    return (
      <>
        <ThankYou survey={survey} token={responseToken} />
        {devReset}
      </>
    );
  }

  // ---- a question ------------------------------------------------------
  const heading = applyTerm(question.text, term);
  const hintId = question.hint ? `${question.id}-hint` : undefined;
  const errorId = error ? `${question.id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const sending = phase === 'sending';

  return (
    <div className={styles.step}>
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
          onAutoAdvance={(candidate) => {
            // Validates the answer BEING chosen, not `answers[...]` from
            // state: this runs inside the same click that sets it, and
            // React has not applied that update yet, so reading state
            // here always saw the question as unanswered and never
            // advanced.
            //
            // It still validates rather than advancing blindly, because
            // an "Other…" option sets a value but needs its text too.
            const message = validateAnswer(question, candidate, countries);
            if (message === null && step < total - 1) goTo(step + 1);
          }}
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
  onAnswer,
  onAutoAdvance
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
  onAutoAdvance: (candidate: Answer) => void;
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

      return (
        <fieldset className={styles.fieldset} aria-describedby={describedBy}>
          <legend className={styles.legend}>{title}</legend>
          {hint}
          <div className={styles.options}>
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
                // Auto-advance happens on pointer clicks only. Arrow keys
                // move the selection within a radio group, so advancing
                // on every change would make a keyboard user skip
                // several questions trying to reach the option they
                // want. They use Continue instead.
                onPointerSelect={
                  advancesOnSelect(question) && !option.isOther
                    ? () =>
                        onAutoAdvance({
                          value: option.id,
                          otherText: answer?.otherText
                        })
                    : undefined
                }
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
                <label key={n} className={styles.scalePoint}>
                  <input
                    type="radio"
                    name={question.id}
                    value={n}
                    checked={answer?.value === n}
                    onChange={() => onAnswer({ value: n })}
                    onClick={() => {
                      onAnswer({ value: n });
                      onAutoAdvance({ value: n });
                    }}
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
  onChange,
  onPointerSelect
}: {
  option: SurveyOption;
  name: string;
  multi: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onPointerSelect?: () => void;
}) {
  return (
    <label className={styles.option}>
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={name}
        value={option.id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onClick={() => {
          if (onPointerSelect) {
            onChange(true);
            onPointerSelect();
          }
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

function ThankYou({
  survey,
  token
}: {
  survey: SurveyDefinition;
  token: string;
}) {
  const shareUrl = `https://www.hardproblems.com/survey/${survey.year}?source=share`;
  const shareText = `I took the ${survey.title} survey and you should too! ${shareUrl} Please re-share.`;
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.thankYou}>
      <h2 className="section-label">Thank you</h2>
      <p>
        Your answers are in. We will publish what everyone said once the survey
        closes.
      </p>

      <h3 className={styles.thankYouHeading}>Help us reach more people</h3>
      <p>The more designers answer, the more the results are worth.</p>
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
          {copied ? 'Copied' : 'Copy to share'}
        </button>
      </div>

      <EmailCapture year={survey.year} token={token} />
    </div>
  );
}

function EmailCapture({ year, token }: { year: number; token: string }) {
  const [email, setEmail] = useState('');
  // GDPR: unticked by default. Consent has to be a clear affirmative
  // action, so a pre-ticked box is not consent — see the note in the
  // submit route.
  const [newsletter, setNewsletter] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(
    'idle'
  );

  if (state === 'done') {
    return (
      <p className={styles.emailDone}>
        Thanks — we&rsquo;ll send the results to {email}.
      </p>
    );
  }

  return (
    <form
      className={styles.emailForm}
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        try {
          const res = await fetch('/api/survey/email', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ year, token, email, newsletter })
          });
          setState(res.ok ? 'done' : 'error');
        } catch {
          setState('error');
        }
      }}
    >
      <h3 className={styles.thankYouHeading}>Get the results</h3>
      <label className={styles.label} htmlFor="survey-email">
        Your email address (optional)
      </label>
      <p className={styles.hint} id="survey-email-hint">
        We will use it to send you the report. It is stored separately from your
        answers, so it cannot be matched back to them.
      </p>
      <input
        id="survey-email"
        className={styles.input}
        type="email"
        autoComplete="email"
        aria-describedby="survey-email-hint"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
        />
        <span>
          Also add me to the Hard Problems newsletter. Four or five emails a
          month; unsubscribe any time.
        </span>
      </label>
      {state === 'error' && (
        <p className={styles.errorSummary} role="alert">
          That didn&rsquo;t work. Please check the address and try again.
        </p>
      )}
      <button
        type="submit"
        className="black-button"
        disabled={state === 'sending' || !email}
      >
        {state === 'sending' ? 'Sending…' : 'Send me the results'}
      </button>
    </form>
  );
}
