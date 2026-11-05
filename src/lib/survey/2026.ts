// The 2026 "Are design and product good careers?" survey.
//
// Pure data — see types.ts for why. To run this again next year, copy
// this file to 2027.ts, change the dates, adjust the questions, and
// register it in index.ts. Keep question and option ids identical for
// anything you want to compare year over year; reword labels freely.

import type { SurveyDefinition } from './types';

// Likert questions all share the same 0–5 shape, so the only thing that
// varies is the wording at each end.
// `labels` runs low to high and must have LIKERT_POINTS entries — the
// test asserts it, because a scale one label short silently renders a
// point with no name.
function likert(id: string, text: string, labels: readonly string[]) {
  return { kind: 'likert' as const, id, text, labels };
}

export const SURVEY_2026: SurveyDefinition = {
  year: 2026,
  title: 'Are design and product good careers?',
  intro:
    'We want to hear from designers, researchers, writers and product people about how they feel about their career paths.',
  image: '/images/content/thumb-survey-2026.jpg',
  opensAt: '2026-11-04T00:00:00.000Z',
  // Exclusive: the form closes as 30 November ends.
  closesAt: '2026-12-01T00:00:00.000Z',

  termSourceId: 'role',
  // Supplies `{term}` / `{Term}` in later questions, so a product
  // manager is asked about "product management" rather than "design".
  //
  // Every entry but the last two falls out of the role name. `founder`
  // and `other` do not, so they also carry a `roleSubjects` override
  // below: the noun that works in "a career in …" is not the one that
  // works as the subject of "… in 2026 feels like…".
  roleTerms: {
    'product-designer': 'design',
    'graphic-designer': 'design',
    'brand-designer': 'design',
    illustrator: 'illustration',
    'motion-designer': 'motion design',
    'service-designer': 'service design',
    'industrial-designer': 'design',
    'design-researcher': 'user research',
    'ux-designer': 'design',
    'ui-designer': 'design',
    'design-writer': 'writing',
    'product-manager': 'product management',
    founder: 'startups',
    other: 'design'
  },
  // Headings for the shared steps — see `group` on a question.
  groups: {
    'about-you': { title: 'About you and where you work' }
  },

  // Subject position only — see roleSubjects on SurveyDefinition.
  roleSubjects: {
    founder: 'being a founder',
    other: 'my career'
  },
  defaultTerm: 'design',

  questions: [
    {
      kind: 'single',
      id: 'role',
      text: 'What type of role do you have?',
      hint: 'Please choose the one that fits you best.',
      // Alphabetical so a long list is scannable; "Other…" stays last.
      order: 'alphaExceptLast',
      options: [
        { id: 'product-designer', label: 'Digital Product Designer' },
        { id: 'graphic-designer', label: 'Graphic Designer' },
        { id: 'brand-designer', label: 'Brand Designer' },
        { id: 'illustrator', label: 'Illustrator' },
        { id: 'motion-designer', label: 'Motion Designer' },
        { id: 'service-designer', label: 'Service Designer' },
        { id: 'industrial-designer', label: 'Industrial Designer' },
        { id: 'design-researcher', label: 'User Researcher' },
        { id: 'ux-designer', label: 'UX Designer' },
        { id: 'ui-designer', label: 'UI Designer' },
        { id: 'design-writer', label: 'Writer' },
        { id: 'product-manager', label: 'Product Manager' },
        { id: 'founder', label: 'Founder/business' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    likert('career-satisfaction', 'How satisfied are you in your career?', [
      'Not satisfied at all',
      'Mostly dissatisfied',
      'Slightly dissatisfied',
      'Slightly satisfied',
      'Mostly satisfied',
      'Extremely satisfied'
    ]),
    likert('role-security', 'How secure do you feel in your current role?', [
      'Very insecure',
      'Fairly insecure',
      'Slightly insecure',
      'Slightly secure',
      'Fairly secure',
      'Rock solid'
    ]),
    likert('skill', 'Are you skilled at your chosen career?', [
      'Not skilled',
      'Learning the basics',
      'Competent',
      'Skilled',
      'Very skilled',
      'Expert'
    ]),
    likert('passion', 'Are you passionate about your chosen career?', [
      'Not passionate',
      'Barely interested',
      'Mildly interested',
      'Quite passionate',
      'Very passionate',
      'Extremely passionate'
    ]),
    likert('pay', 'Do people in your career make enough money?', [
      'Underpaid',
      'Not quite enough',
      'Just about enough',
      'Reasonably paid',
      'Well paid',
      'Extremely well paid'
    ]),
    likert(
      'benefit-to-world',
      'Does your career feel like it benefits the world?',
      [
        'Not at all',
        'Hardly at all',
        'A little',
        'Somewhat',
        'Quite a lot',
        'Enormously'
      ]
    ),

    // Choice-based conjoint — see ConjointQuestion in types.ts. Placed
    // BEFORE "What matters most to you?" so the stated priorities
    // cannot steer the choices; comparing the two afterwards (what
    // people say matters vs. what their choices show) is part of the
    // point.
    //
    // Attribute and level ids are what the analysis reports on, so keep
    // them stable once responses exist; labels can be reworded.
    {
      kind: 'conjoint',
      id: 'job-choice',
      text: 'Which job would you take?',
      hint: 'Imagine you are offered both jobs. Your pick stays, and a new job challenges it — 8 choices to find your winner.',
      rounds: 8,
      attributes: [
        {
          id: 'pay',
          label: 'Pay',
          levels: [
            {
              id: 'less-10',
              label: '10% less than now',
              short: '10% pay cut',
              value: -10
            },
            {
              id: 'same',
              label: 'The same as now',
              short: 'Same pay',
              value: 0
            },
            {
              id: 'more-15',
              label: '15% more than now',
              short: '15% pay rise',
              value: 15
            },
            {
              id: 'more-30',
              label: '30% more than now',
              short: '30% pay rise',
              value: 30
            }
          ]
        },
        {
          id: 'level',
          label: 'Level',
          levels: [
            { id: 'same', label: 'Same level as now', short: 'Same level' },
            { id: 'promotion', label: 'A promotion', short: 'Promotion' }
          ]
        },
        {
          id: 'mission',
          label: 'Mission',
          levels: [
            { id: 'commercial', label: 'Helps businesses to grow' },
            { id: 'some-good', label: 'Some benefit to society' },
            { id: 'for-good', label: 'Directly does good in the world' }
          ]
        },
        {
          id: 'organisation',
          label: 'Organisation',
          levels: [
            // `noun` fills `{organisation}` in the brand line below.
            { id: 'startup', label: 'Early-stage startup', noun: 'startup' },
            {
              id: 'established',
              label: 'Established company',
              noun: 'company'
            },
            { id: 'public', label: 'Public sector', noun: 'department' },
            {
              id: 'nonprofit',
              label: 'Non-profit or charity',
              noun: 'charity'
            }
          ]
        },
        {
          id: 'brand',
          label: 'Brand',
          levels: [
            // On the card the brand names the kind of organisation —
            // "Well-known charity", "Little known department" — so the
            // line reads as a description of the place, not of a logo.
            {
              id: 'household',
              label: 'A household name',
              short: 'Well-known {organisation}'
            },
            {
              id: 'industry',
              label: 'Brand is well-known in its space',
              short: '{Organisation} is well-known in its space'
            },
            {
              id: 'unknown',
              label: 'Little known brand',
              short: 'Little known {organisation}'
            }
          ]
        },
        {
          id: 'work',
          label: 'The work',
          levels: [
            {
              id: 'ai',
              label: 'Cutting-edge AI products',
              short: 'Building cutting-edge AI'
            },
            {
              id: 'established',
              label: 'An established product',
              short: 'Improving an established product'
            }
          ]
        }
      ],
      // Jobs that do not exist, so are never shown.
      exclude: [
        { organisation: 'nonprofit', mission: 'commercial' },
        { organisation: 'startup', brand: 'household' }
      ],
      // Laid out like a job ad: the kind of job as the title, what the
      // work is as its subtitle, the offer in bold, then the brand and
      // why it matters.
      //
      // "Big company job" folds brand into the title — an established
      // company that is a household name. The model still measures
      // organisation and brand separately; only the wording combines
      // them.
      cardTitle: [
        {
          when: { organisation: 'established', brand: 'household' },
          label: 'Big company job'
        },
        { when: { organisation: 'established' }, label: 'Corporate job' },
        { when: { organisation: 'startup' }, label: 'Startup job' },
        { when: { organisation: 'public' }, label: 'Government job' },
        { when: { organisation: 'nonprofit' }, label: 'Charity job' }
      ],
      card: [
        { attributes: ['work'], subtitle: true },
        { attributes: ['pay', 'level'], icon: 'banknote', strong: true },
        { attributes: ['brand'], icon: 'building' },
        { attributes: ['mission'], icon: 'heart' }
      ]
    },

    {
      kind: 'multi',
      id: 'what-matters',
      text: 'What matters most to you?',
      // A suggestion, not a rule — nothing enforces the number. The
      // selection cap that used to back wording like this was removed
      // from the schema entirely.
      hint: 'Choose 2–3 criteria that matter to you most.',
      order: 'shuffle',
      options: [
        { id: 'craft', label: 'Craft' },
        { id: 'purpose', label: 'Purpose' },
        { id: 'autonomy', label: 'Autonomy' },
        { id: 'money', label: 'Money' },
        { id: 'business-impact', label: 'Business impact' },
        { id: 'work-life-balance', label: 'Work/life balance' },
        { id: 'recognition', label: 'Recognition' },
        { id: 'creative-freedom', label: 'Creative freedom' },
        { id: 'great-team', label: 'Great team' },
        { id: 'great-manager', label: 'Great manager' },
        { id: 'career-growth', label: 'Career growth' }
      ]
    },

    {
      kind: 'multi',
      id: 'feelings',
      text: 'What best captures your feelings about your career?',
      hint: 'Choose as many as you like.',
      order: 'shuffle',
      options: [
        { id: 'optimistic', label: 'Optimistic' },
        { id: 'excited', label: 'Excited' },
        { id: 'confident', label: 'Confident' },
        { id: 'grateful', label: 'Grateful' },
        { id: 'fulfilled', label: 'Fulfilled' },
        { id: 'curious', label: 'Curious' },
        { id: 'comfortable', label: 'Comfortable' },
        { id: 'restless', label: 'Restless' },
        { id: 'uncertain', label: 'Uncertain' },
        { id: 'mixed', label: 'Mixed feelings' },
        { id: 'anxious', label: 'Anxious' },
        { id: 'frustrated', label: 'Frustrated' },
        { id: 'exhausted', label: 'Exhausted' },
        { id: 'undervalued', label: 'Undervalued' },
        { id: 'disillusioned', label: 'Disillusioned' }
      ]
    },

    {
      kind: 'text',
      id: 'metaphor',
      text: '{Subject} in 2026 feels like…',
      hint: 'Finish the sentence with a metaphor.',
      maxLength: 200
    },

    likert(
      'still-here-in-5',
      'How likely are you to still be working in {term} in five years?',
      [
        'Not working in this field',
        'Probably not',
        'Leaning towards leaving',
        'Leaning towards staying',
        'Probably',
        'Definitely working in this field'
      ]
    ),

    {
      kind: 'single',
      id: 'would-recommend',
      text: 'Would you recommend a career in {term} to a younger friend?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    {
      kind: 'single',
      id: 'work-you-hoped-for',
      text: 'Think back to why you started. Are you doing the kind of work you hoped you would?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    {
      kind: 'single',
      id: 'burnout',
      text: 'Do you feel burnt out?',
      options: [
        { id: 'burnt-out', label: 'Burnt out' },
        { id: 'close', label: 'Close to burn out' },
        { id: 'not-burnt-out', label: 'Not burnt out' }
      ]
    },

    {
      kind: 'single',
      id: 'proud-of-shipping',
      text: 'Are you proud of something you shipped this year?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    likert('ai-usage', 'How much is AI being used in your day-to-day work?', [
      'I never use AI',
      'I rarely use AI',
      'I use AI occasionally',
      'I use AI regularly',
      'I use AI daily',
      'I use AI most of the time'
    ]),

    {
      kind: 'multi',
      id: 'ai-feelings',
      text: 'How do you feel about AI in your work?',
      hint: 'Choose as many as you like.',
      // "Other…" stays last; the rest are shuffled.
      order: 'shuffleExceptLast',
      options: [
        { id: 'took-the-fun', label: 'Taken the fun parts' },
        { id: 'freed-me-up', label: 'Freed me up to focus on what matters' },
        { id: 'more-productive', label: 'Allows me to be more productive' },
        { id: 'reduced-quality', label: 'Reduced quality' },
        { id: 'improved-quality', label: 'Improved quality' },
        { id: 'replaced-me', label: 'Replaced me' },
        { id: 'isolated', label: 'Feel isolated' },
        { id: 'improved-skills', label: 'Improved my skillset' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    // ---- one step, five short questions ----------------------------
    //
    // The quick factual ones, asked together. Every other question in
    // this survey asks someone to weigh something up and gets a page to
    // itself; these five are recall, not judgement, and a page each
    // would turn half a minute of answering into five page loads near
    // the end of a long survey — which is where people give up.
    //
    // They stay five separate questions in the data. `group` only
    // changes how many appear at once.
    {
      kind: 'single',
      id: 'manages-people',
      group: 'about-you',
      text: 'Do you manage people?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    {
      kind: 'single',
      id: 'experience',
      group: 'about-you',
      text: 'How long have you been working professionally?',
      options: [
        { id: 'student', label: 'Student' },
        { id: 'recent-graduate', label: 'Recent graduate' },
        { id: '1-5', label: '1–5 years' },
        { id: '5-10', label: '5–10 years' },
        { id: '10-20', label: '10–20 years' },
        { id: '20-plus', label: '20+ years' }
      ]
    },

    {
      kind: 'country',
      id: 'country',
      group: 'about-you',
      text: 'Where are you in the world?'
    },

    {
      kind: 'single',
      id: 'org-size',
      group: 'about-you',
      text: 'How big is your company or organisation?',
      options: [
        { id: '1', label: 'Just me' },
        { id: '2-10', label: '2–10' },
        { id: '11-50', label: '11–50' },
        { id: '50-250', label: '50–250' },
        { id: '250-1000', label: '250–1,000' },
        { id: '1000-plus', label: '1,000+' }
      ]
    },

    {
      kind: 'single',
      id: 'designer-count',
      group: 'about-you',
      text: 'How many designers work at your company or organisation?',
      options: [
        { id: '1-5', label: '1–5' },
        { id: '5-10', label: '5–10' },
        { id: '10-20', label: '10–20' },
        { id: '20-50', label: '20–50' },
        { id: '50-plus', label: '50+' }
      ]
    },

    {
      kind: 'single',
      id: 'org-type',
      text: 'What type of organisation do you work at?',
      hint: 'Choose the one that fits you best.',
      options: [
        { id: 'startup', label: 'Startup' },
        { id: 'scale-up', label: 'Scale-up' },
        { id: 'big-tech', label: 'Big tech' },
        { id: 'enterprise', label: 'Enterprise' },
        { id: 'agency', label: 'Agency' },
        { id: 'in-house', label: 'In-house at a non-tech company' },
        { id: 'public-sector', label: 'Public sector' },
        { id: 'nonprofit', label: 'Non-profit' },
        { id: 'self-employed', label: 'Self-employed' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    {
      kind: 'multi',
      id: 'sectors',
      text: 'What are the main sectors you work in?',
      hint: 'Choose as many as you like.',
      order: 'alpha',
      options: [
        { id: 'government', label: 'Government' },
        { id: 'enterprise-software', label: 'Enterprise software' },
        { id: 'developer-tools', label: 'Developer tools' },
        { id: 'media', label: 'Media or publishing' },
        { id: 'gaming', label: 'Gaming' },
        { id: 'hospitality', label: 'Hospitality' },
        { id: 'education', label: 'Education' },
        { id: 'health', label: 'Health' },
        { id: 'ai', label: 'AI' },
        { id: 'finance', label: 'Finance' },
        { id: 'ecommerce', label: 'Ecommerce' },
        { id: 'nonprofit', label: 'Nonprofit or charity' },
        { id: 'telecommunications', label: 'Telecommunications' },
        { id: 'consumer-tech', label: 'Consumer tech' },
        { id: 'automotive', label: 'Automotive' }
      ]
    },

    {
      kind: 'textarea',
      id: 'one-change',
      text: 'If you could change one thing about the design industry, what would it be?',
      hint: 'Optional — you can skip this and finish.',
      optional: true,
      maxLength: 2000
    }
  ]
};
