// Schema for the annual survey.
//
// The point of this file is that a year's questionnaire is DATA, not
// code: `2026.ts` is a single exported object, and the page, the
// progress bar, the client-side validation and the server-side
// validation are all derived from it. Adding next year's survey should
// mean writing one new definition file and nothing else.
//
// That is also the security story. The server validates a submission by
// walking this definition — an answer is accepted only if its question
// exists, its shape matches the declared kind, and (for choice
// questions) the option id is one this definition declares. Nothing
// free-form reaches storage except the fields explicitly declared as
// text, and those carry their own length caps.

export type SurveyOption = {
  /**
   * Stable identifier, stored in the database and compared against on
   * submit. Keep these unchanged between years where a question is
   * unchanged, so answers remain comparable year over year — the labels
   * can be reworded freely, the ids should not be.
   */
  id: string;
  label: string;
  /**
   * Reveals a free-text input when chosen ("Other…"). The text is stored
   * alongside the option id, capped at OTHER_MAX_LENGTH.
   */
  isOther?: boolean;
  /**
   * On a `scale` question, an answer that is not a point on the scale
   * ("Can't choose"). Shown in black rather than coloured, so it does
   * not read as the far end of the scale.
   */
  offScale?: boolean;
};

/**
 * How to order the options when rendering.
 *
 * `shuffle` and `shuffleExceptLast` are seeded per respondent so the
 * order stays put when they navigate backwards and forwards — a list
 * that reshuffles under you is both disorienting and a good way to
 * record an accidental answer.
 */
export type OptionOrder =
  'given' | 'alpha' | 'alphaExceptLast' | 'shuffle' | 'shuffleExceptLast';

type BaseQuestion = {
  /**
   * Stable across years. Used as the step's URL fragment, the storage
   * key, and the column this answer lands in for analysis.
   */
  id: string;
  /**
   * The question, as asked. May contain `{term}` or `{Term}`, which are
   * replaced with the wording derived from the respondent's answer to
   * the role question — see `termSourceId` on SurveyDefinition.
   */
  text: string;
  /** Rendered as a GDS-style hint above the inputs, not as placeholder text. */
  hint?: string;
  /** Only question 25 is optional; everything else must be answered. */
  optional?: boolean;
  /**
   * Put this question on a shared step with its neighbours.
   *
   * One question per page is the GDS default and the right one for
   * anything that needs thought. It is the wrong one for a run of
   * short factual questions — role, experience, country, company size
   * — where a page each turns five seconds of typing into five page
   * loads, and the length of the survey becomes the reason people
   * leave it.
   *
   * CONSECUTIVE questions sharing a group id render as one step, under
   * the heading in `groups`. The questions stay separate entries here,
   * so storage, validation and analysis are unchanged — this only
   * affects how many of them appear at once.
   */
  group?: string;
};

/** One choice from a list. Radio buttons, then Continue. */
export type SingleQuestion = BaseQuestion & {
  kind: 'single';
  options: SurveyOption[];
  order?: OptionOrder;
  /**
   * Radios by default. `select` is for long lists of ordered values —
   * years of experience, company size — where radios take a screenful
   * for something nobody needs to compare side by side.
   *
   * Presentation only: the answer is still one option id, validated by
   * exactly the same rule.
   *
   * `checkbox` is for a yes/no statement the respondent confirms
   * rather than chooses: one box, with the question's text as its
   * label. It needs exactly two options — the first is the ticked
   * answer, the second the unticked one — and starts ticked.
   *
   * Ticked is the default and is never stored: only the unticked answer
   * is (see normalizeAnswers). So a response that leaves it ticked is
   * stored exactly as one from before the checkbox existed, and a
   * missing answer always means ticked.
   */
  as?: 'radio' | 'select' | 'checkbox';
  /**
   * The options are a scale, best first: coloured green through to
   * red, in the given order, like a likert. For a scale the 0–5 likert
   * cannot hold — more points, or an off-scale answer. Options marked
   * `offScale` are left out of the colour run.
   *
   * `'list'` stacks the options in the given order; `'row'` sets them
   * side by side like a likert, reversed so red is on the left (a list
   * again on narrow screens). Either way, list them best first here.
   */
  scale?: 'list' | 'row';
};

/** Several choices from a list. Checkboxes; needs an explicit Continue. */
export type MultiQuestion = BaseQuestion & {
  kind: 'multi';
  options: SurveyOption[];
  order?: OptionOrder;
};

/**
 * A 0–5 scale with labelled ends. Rendered as six radio buttons rather
 * than a slider: GDS advises against sliders because they are hard to
 * operate with a keyboard, invisible to a screen reader as a set of
 * discrete choices, and impossible to leave genuinely unanswered.
 */
export type LikertQuestion = BaseQuestion & {
  kind: 'likert';
  /**
   * One label per point, low to high — LIKERT_POINTS of them.
   *
   * Every point is named rather than just the two ends. A bare 0-5 row
   * with captions underneath asks the respondent to invent the middle
   * for themselves, and two people reading "3" as "fine" and "could be
   * worse" produce the same number from different answers. Naming each
   * point is what makes the results comparable.
   *
   * It is also why these render as a vertical list: six labels do not
   * fit across a reading column, and shrinking them to fit is how you
   * get a scale nobody reads.
   */
  labels: readonly string[];
  /**
   * Stack the points, highest first (green at the top), instead of a
   * row. Display only: the stored 0–5 values are unchanged.
   */
  list?: boolean;
};

/** Single-line free text. */
export type TextQuestion = BaseQuestion & {
  kind: 'text';
  maxLength: number;
};

/** Multi-line free text. */
export type TextareaQuestion = BaseQuestion & {
  kind: 'textarea';
  maxLength: number;
};

/**
 * Country picker. The list is not inlined here because the site already
 * carries a 178-country table; the renderer supplies it so this
 * definition stays about the questionnaire.
 */
export type CountryQuestion = BaseQuestion & {
  kind: 'country';
};

/** One attribute of a conjoint job card, and the values it can take. */
export type ConjointAttribute = {
  /** Stable id, stored in every answer. Keep unchanged between years. */
  id: string;
  /** The row label on the card: "Pay", "Organisation". */
  label: string;
  /**
   * The values, each with a stable id. Two to four is the useful range:
   * more levels need more respondents to estimate, and a level that
   * appears rarely is measured badly.
   */
  levels: {
    id: string;
    label: string;
    /**
     * Shorter wording for the job card — "15% pay rise" rather than
     * "15% more than now". Falls back to `label`. The long label is
     * still what the analysis reports.
     *
     * May name another attribute in braces — "Well-known
     * {organisation}" — which becomes that attribute's `noun` on the
     * same card: "Well-known charity". `{Organisation}` capitalises it.
     */
    short?: string;
    /**
     * This level as a plain noun, for other levels' `short` to borrow:
     * "charity", "department".
     */
    noun?: string;
    /**
     * Set by a translation (see i18n/content.ts) in place of `short`:
     * the card wording for each level of `attribute` on the same card.
     * "Well-known {organisation}" assembled from parts cannot agree an
     * adjective with the noun's gender; a whole phrase per organisation
     * can.
     */
    shortBy?: { attribute: string; values: Record<string, string> };
    /**
     * The icon for this level, in place of its line's `icon` — so a
     * line can show which way something goes (say, up or across). Only on a line of one attribute.
     */
    icon?: ConjointIcon;
    /**
     * A number for the level, on the attribute that is money. Only the
     * analysis reads it: with pay as a number it can price every other
     * attribute in pay — "doing good is worth 9% of salary".
     */
    value?: number;
  }[];
};

/**
 * Choice-based conjoint.
 *
 * The respondent sees two job cards, built from `attributes` with
 * values drawn at random, and picks the one they would take — `rounds`
 * times, with two fresh cards each time.
 *
 * The cards are built rather than real jobs so the attributes vary
 * independently of each other. A real job is a bundle (big brand AND
 * high pay AND AI), and choices between bundles cannot say which part
 * of the bundle did the work. Varying each attribute on its own is what
 * lets the analysis (conjoint-analysis.ts) put a weight on each one.
 *
 * Cards come from the per-response seed, so they stay put across back
 * and forward navigation. The answer stores the cards as shown — see
 * conjoint.ts for the format — so the server can check every value is
 * one declared here without needing the seed.
 */
export type ConjointQuestion = BaseQuestion & {
  kind: 'conjoint';
  attributes: ConjointAttribute[];
  /** Number of choices, so `rounds + 1` cards are seen in all. */
  rounds: number;
  /**
   * Combinations that never appear on one card, because no real job
   * looks like that — a nonprofit whose mission is to grow a business,
   * a startup with 100 designers. Each entry maps attribute id → level
   * id, and a card matching every pair in an entry is redrawn.
   *
   * Use sparingly. Each one makes some attributes move together a
   * little, which is the thing the design exists to avoid.
   */
  exclude?: Record<string, string>[];
  /**
   * The card's title, like a job ad's: "Charity job", "Big company job".
   * Derived from the card's levels — the first entry whose `when`
   * matches wins, so put the most specific first. Presentation only,
   * like `card`; an attribute used here can be left off the lines.
   */
  cardTitle?: { when: Record<string, string>; label: string }[];
  /**
   * How a card is laid out, as lines of a job ad under the title. Each
   * line joins its attributes' values with " · " and carries an icon;
   * `strong` sets it in bold, `subtitle` tucks it under the title. Every attribute should appear once,
   * here or in `cardTitle` (the test checks). Presentation only —
   * answers are stored in `attributes` order whatever this says.
   * Without it, one plain line per attribute.
   */
  card?: {
    attributes: string[];
    icon?: ConjointIcon;
    strong?: boolean;
    /** Set directly under the title as plain text: no icon, no bold. */
    subtitle?: boolean;
  }[];
};

/** Icons a conjoint card line can carry; the form maps them to lucide. */
export type ConjointIcon =
  | 'arrow-down'
  | 'arrow-right'
  | 'arrow-up'
  | 'banknote'
  | 'briefcase'
  | 'building'
  | 'heart'
  | 'sparkles'
  | 'users';

export type SurveyQuestion =
  | SingleQuestion
  | MultiQuestion
  | LikertQuestion
  | TextQuestion
  | TextareaQuestion
  | CountryQuestion
  | ConjointQuestion;

export const LIKERT_MIN = 0;
export const LIKERT_MAX = 5;
/** How many labels a Likert question must carry. */
export const LIKERT_POINTS = LIKERT_MAX - LIKERT_MIN + 1;

/** Cap on the free text behind an "Other…" option. */
export const OTHER_MAX_LENGTH = 100;

export type SurveyDefinition = {
  /** Calendar year, and the URL segment: /survey/2026. */
  year: number;
  /** The full name: page title, listings, social cards, share text. */
  title: string;
  /**
   * The name on the survey page's own header, where the full title
   * would be long. Falls back to `title`.
   */
  shortTitle?: string;
  /** Shown on the landing page above the Start button. */
  intro: string;
  /**
   * Paragraphs under the intro on the start page only — why the survey
   * matters. Not used in listings or social cards, where `intro` stands
   * alone.
   */
  why?: string[];
  /**
   * Roughly how long it takes, in minutes: the start screen's "about 7
   * minutes" and the homepage card's "7 min survey".
   */
  minutes: number;
  /**
   * Card and social-share image, as a site-absolute path. Follows the
   * articles' convention: `thumb-*` images are used for listings and for
   * openGraph/twitter, not as an on-page hero.
   *
   * It matters more here than on an article — the end of the survey asks
   * people to share the link, so this is the picture that travels.
   */
  image?: string;
  /**
   * Inclusive opening date and EXCLUSIVE closing instant. After this the
   * permalink still renders — the questionnaire, the intro and the
   * results when they exist — but the form itself is closed.
   */
  opensAt: string;
  closesAt: string;
  /**
   * The question whose answer supplies `{term}`. Its options each carry
   * a `term`; see roleTerms below.
   */
  termSourceId: string;
  /**
   * Headings for the shared steps — see `group` on a question. Keyed by
   * group id; a group with no entry here falls back to no heading.
   */
  groups?: Record<
    string,
    {
      title: string;
      hint?: string;
      /**
       * Asked only after the answers are sent, as an unnumbered bonus
       * round — see bonus.ts. Its questions must all be optional.
       */
      afterSend?: boolean;
    }
  >;
  /** Option id → the wording used for `{term}` in later questions. */
  roleTerms: Record<string, string>;
  /**
   * Option id → the sentence SUBJECT used for `{Subject}`, for roles
   * whose field noun cannot also serve as one.
   *
   * Most roles need only `roleTerms`: "design" works both as the
   * subject of "Design in 2026 feels like…" and inside "a career in
   * design". "Founder" has no single noun that does both — "Being a
   * founder in 2026 feels like…" but "a career in startups" — so the
   * two forms are allowed to diverge. Partial: anything absent here
   * falls back to its `roleTerms` entry.
   */
  roleSubjects?: Record<string, string>;
  /**
   * Role id → question id → that question's whole wording, for a role
   * no single noun can serve. Takes precedence over `{term}` and
   * `{Subject}` substitution for that question.
   *
   * Founders are the case: they run startups, agencies, NGOs and big
   * companies, so "a career in startups" or "working in design" both
   * misdescribe many of them, and no field noun fits all three
   * questions that ask about the work itself.
   */
  roleQuestionText?: Record<string, Record<string, string>>;
  /** Fallback when the role question is somehow unanswered. */
  defaultTerm: string;
  /**
   * Different wording for respondents who are not working at the
   * moment, switched on by one answer to one question (the "I'm
   * working at the moment" checkbox). Only words change — question
   * ids, options and the stored answers are the same either way, so
   * the two groups are analysed together and told apart by that one
   * answer.
   *
   * `questions` replaces a question's text and/or hint; `levels`
   * replaces conjoint card wording (`short`), keyed attribute id →
   * level id. `groups` replaces a group's heading.
   */
  notWorking?: NotWorkingWording & {
    /** The question, and the answer to it, that switches the wording. */
    when: { question: string; answer: string };
  };
  questions: SurveyQuestion[];
};

export type NotWorkingWording = {
  questions: Record<
    string,
    {
      text?: string;
      hint?: string;
      levels?: Record<string, Record<string, string>>;
    }
  >;
  groups?: Record<string, { title: string }>;
};
