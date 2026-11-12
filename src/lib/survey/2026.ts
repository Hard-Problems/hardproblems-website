// The 2026 "What we want from work" survey.
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
function likert(
  id: string,
  text: string,
  labels: readonly string[],
  display: { list?: boolean } = {}
) {
  return { kind: 'likert' as const, id, text, labels, ...display };
}

export const SURVEY_2026: SurveyDefinition = {
  year: 2026,
  title: 'What we want from work: A Design & Product Survey',
  minutes: 7,
  shortTitle: 'What we want from work',
  intro:
    'A survey for designers, researchers, writers and product people about how they feel about their careers.',
  why: [
    'There’s a lot of data on what companies want from designers and PMs, and almost none on what designers and PMs want from their careers. Help us fix that. What actually makes people feel satisfied with their work?',
    'In our report, we will try to show where people find joy and pride in our industry.'
  ],
  image: '/images/content/thumb-survey-2026.jpg',
  // Midnight UTC, which is midnight in London in November.
  opensAt: '2026-11-11T00:00:00.000Z',
  // Exclusive: the form closes as 30 November ends.
  closesAt: '2026-12-01T00:00:00.000Z',

  termSourceId: 'role',
  // Supplies `{term}` / `{Term}` in later questions, so a product
  // manager is asked about "product management" rather than "design".
  //
  // Every entry but the last two falls out of the role name. `other`
  // gets "your field", which reads in every template without assuming
  // what the field is. `founder` has its own wording for each question
  // instead (see roleQuestionText below); its entry here is only a
  // fallback.
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
    founder: 'your organisation',
    other: 'your field'
  },
  // Headings for the shared steps — see `group` on a question.
  groups: {
    'about-you': { title: 'About you and where you work' },
    bonus: {
      title: 'Bonus round',
      hint: 'Your answers are saved.',
      afterSend: true
    }
  },

  // Subject position only — see roleSubjects on SurveyDefinition.
  roleSubjects: {
    founder: 'being a founder',
    other: 'my career'
  },

  // Founders run startups, agencies, NGOs and big companies, so they
  // get questions about being a founder rather than about a field.
  // `{Subject}` already covers the metaphor ("Being a founder in 2026
  // feels like…").
  roleQuestionText: {
    founder: {
      'still-here-in-5':
        'How likely are you to still be running your own organisation in five years?',
      'would-recommend':
        'Would you recommend becoming a founder to a younger friend?'
    }
  },
  defaultTerm: 'design',

  // For people between jobs: unticking "I'm working at the moment" on
  // the first step turns the questions about a current job into ones
  // about their most recent job. Responses sent before the checkbox
  // existed have no answer to it and are taken as working.
  notWorking: {
    when: { question: 'has-job', answer: 'no' },
    groups: {
      'about-you': { title: 'About you and where you worked most recently' }
    },
    questions: {
      'career-satisfaction': {
        text: 'How satisfied were you in your most recent job?',
        hint: 'If you haven’t had a job yet, think about the closest thing you’ve done, such as an internship or a big project.'
      },
      'role-security': {
        text: 'How secure did you feel in your most recent role?'
      },
      skill: { text: 'In my opinion, I was good at my most recent job' },
      passion: { text: 'You were enthusiastic about your most recent job' },
      pay: {
        text: 'Considering all my efforts and achievements in my most recent job, I felt I got paid appropriately'
      },
      'benefit-to-world': { text: 'My most recent job was useful to society' },
      'job-choice': {
        levels: {
          pay: {
            'less-30': '30% below your last pay',
            'less-15': '15% below your last pay',
            same: 'Same as your last pay',
            'more-15': '15% above your last pay',
            'more-30': '30% above your last pay'
          }
        }
      },
      burnout: {
        text: 'How often did you feel burnt out by your most recent job?'
      },
      'manages-people': {
        text: 'Did you manage people in your most recent job?'
      },
      'org-size': {
        text: 'How big was your most recent company or organisation?'
      },
      'designer-pm-count': {
        text: 'How many designers and PMs worked at your most recent company or organisation?'
      },
      'org-type': {
        text: 'What type of organisation did you most recently work at?'
      },
      sectors: {
        text: 'What were the main sectors you most recently worked in?'
      }
    }
  },

  questions: [
    {
      kind: 'single',
      id: 'role',
      // Shares the first step with 'has-job' below. No entry in
      // `groups`, so the step has no heading of its own: the role
      // question stays the step's heading, with the checkbox under it.
      group: 'start',
      text: 'What type of role do you have?',
      hint: 'Choose the one that fits you best.',
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

    {
      // Added on 11 November 2026, after the survey opened, for people
      // between jobs. Starts ticked; unticking it rewords the job
      // questions (see `notWorking` above). Only 'no' is ever stored:
      // a response with no answer here is someone working, whether it
      // was sent before or after the checkbox existed.
      kind: 'single',
      id: 'has-job',
      group: 'start',
      as: 'checkbox',
      text: 'I’m working at the moment (employed or freelance)',
      hint: 'Untick if you’re between jobs.',
      options: [
        { id: 'yes', label: 'Working at the moment' },
        { id: 'no', label: 'Not working at the moment' }
      ]
    },

    {
      // A single choice rather than a likert: seven points plus "Can't
      // choose", which the 0–5 likert shape cannot hold. `scale` gives
      // it the likert's colours anyway, best (green) to worst (red), in
      // the order given here.
      kind: 'single',
      id: 'career-satisfaction',
      text: 'How satisfied are you in your (main) job?',
      scale: 'list',
      options: [
        { id: 'completely-satisfied', label: 'Completely satisfied' },
        { id: 'very-satisfied', label: 'Very satisfied' },
        { id: 'fairly-satisfied', label: 'Fairly satisfied' },
        {
          id: 'neither',
          label: 'Neither satisfied nor dissatisfied'
        },
        { id: 'fairly-dissatisfied', label: 'Fairly dissatisfied' },
        { id: 'very-dissatisfied', label: 'Very dissatisfied' },
        { id: 'completely-dissatisfied', label: 'Completely dissatisfied' },
        { id: 'cant-choose', label: 'Can’t choose', offScale: true }
      ]
    },
    likert('role-security', 'How secure do you feel in your current role?', [
      'Very insecure',
      'Fairly insecure',
      'Slightly insecure',
      'Slightly secure',
      'Fairly secure',
      'Rock solid'
    ]),
    {
      // Five points, so a coloured single choice rather than the 0–5
      // likert.
      kind: 'single',
      id: 'skill',
      text: 'In my opinion, I am good at my job',
      scale: 'row',
      options: [
        { id: 'always', label: 'Always' },
        { id: 'most-of-the-time', label: 'Most of the time' },
        { id: 'sometimes', label: 'Sometimes' },
        { id: 'rarely', label: 'Rarely' },
        { id: 'never', label: 'Never' }
      ]
    },
    {
      // Same shape as 'skill' above.
      kind: 'single',
      id: 'passion',
      text: 'You are enthusiastic about your job',
      scale: 'row',
      options: [
        { id: 'always', label: 'Always' },
        { id: 'most-of-the-time', label: 'Most of the time' },
        { id: 'sometimes', label: 'Sometimes' },
        { id: 'rarely', label: 'Rarely' },
        { id: 'never', label: 'Never' }
      ]
    },
    {
      // Five points, so a coloured single choice like 'skill'.
      kind: 'single',
      id: 'pay',
      text: 'Considering all my efforts and achievements in my job, I feel I get paid appropriately',
      scale: 'row',
      options: [
        { id: 'strongly-agree', label: 'Strongly agree' },
        { id: 'tend-to-agree', label: 'Tend to agree' },
        { id: 'neither', label: 'Neither' },
        { id: 'tend-to-disagree', label: 'Tend to disagree' },
        { id: 'strongly-disagree', label: 'Strongly disagree' }
      ]
    },
    {
      // Five points plus "Can't choose", like 'career-satisfaction'.
      kind: 'single',
      id: 'benefit-to-world',
      text: 'My job is useful to society',
      scale: 'row',
      options: [
        { id: 'strongly-agree', label: 'Strongly agree' },
        { id: 'agree', label: 'Agree' },
        { id: 'neither', label: 'Neither agree nor disagree' },
        { id: 'disagree', label: 'Disagree' },
        { id: 'strongly-disagree', label: 'Strongly disagree' },
        { id: 'cant-choose', label: 'Can’t choose', offScale: true }
      ]
    },

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
      hint: 'Imagine you are offered both jobs. Pick the one you’d prefer.',
      rounds: 8,
      attributes: [
        {
          id: 'pay',
          label: 'Pay',
          levels: [
            {
              id: 'less-30',
              label: '30% less than now',
              short: '30% pay cut',
              value: -30
            },
            {
              id: 'less-15',
              label: '15% less than now',
              short: '15% pay cut',
              value: -15
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
              label: 'Nonprofit or charity',
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
            },
            {
              id: 'new',
              label: 'New product development',
              short: 'Developing a new product'
            }
          ]
        }
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
        { attributes: ['pay'], icon: 'banknote', strong: true },
        { attributes: ['brand'], icon: 'building' },
        { attributes: ['mission'], icon: 'heart' }
      ]
    },

    {
      kind: 'multi',
      id: 'what-matters',
      // "2–3" is a suggestion, not a rule — nothing enforces the number.
      // The selection cap that used to back wording like this was
      // removed from the schema entirely.
      text: 'What 2–3 matter most to you?',
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
      hint: 'Multiple choice',
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
      hint: 'Finish the sentence.',
      maxLength: 200,
      // Optional from 12 Nov 2026, with a Skip button: it was the step
      // most people stopped at. Earlier respondents all answered it.
      optional: true
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
      ],
      // Stacked: the labels are long for a row.
      { list: true }
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
      // Five points, not three ("Burnt out / Close to / Not"): three
      // answers lump very different people together, which blurs any
      // link with satisfaction and makes burnout look like a weaker
      // driver than it is (shown by scripts/survey-simulate.ts).
      // Frequency wording is close to how burnout is usually measured.
      // Listed best first like every `scale` question, so as a row it
      // reads Always (red) to Never (green).
      kind: 'single',
      id: 'burnout',
      text: 'How often do you feel burnt out by your work?',
      scale: 'row',
      options: [
        { id: 'never', label: 'Never' },
        { id: 'rarely', label: 'Rarely' },
        { id: 'sometimes', label: 'Sometimes' },
        { id: 'often', label: 'Often' },
        { id: 'always', label: 'Always' }
      ]
    },

    {
      kind: 'single',
      id: 'proud-of-shipping',
      text: 'Are you proud of something you created this year?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    likert(
      'ai-usage',
      'How much is AI being used in your day-to-day work?',
      [
        'I never use AI',
        'I rarely use AI',
        'I use AI occasionally',
        'I use AI regularly',
        'I use AI daily',
        'I use AI most of the time'
      ],
      { list: true }
    ),

    {
      kind: 'multi',
      id: 'ai-feelings',
      text: 'How do you feel about AI in your work?',
      hint: 'Multiple choice',
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
        { id: '1-4', label: '1–4 years' },
        { id: '5-9', label: '5–9 years' },
        { id: '10-19', label: '10–19 years' },
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
        { id: '2-9', label: '2–9' },
        { id: '10-49', label: '10–49' },
        { id: '50-249', label: '50–249' },
        { id: '250-999', label: '250–999' },
        { id: '1000-plus', label: '1,000+' }
      ]
    },

    {
      kind: 'single',
      id: 'designer-pm-count',
      group: 'about-you',
      text: 'How many designers and PMs work at your company or organisation?',
      options: [
        { id: '1-4', label: '1–4' },
        { id: '5-9', label: '5–9' },
        { id: '10-19', label: '10–19' },
        { id: '20-49', label: '20–49' },
        { id: '50-plus', label: '50+' }
      ]
    },

    {
      kind: 'single',
      id: 'org-type',
      text: 'What type of organisation do you work at?',
      hint: 'Choose the one that fits you best.',
      // Alphabetical so it is scannable; "Other…" stays last.
      order: 'alphaExceptLast',
      options: [
        { id: 'startup', label: 'Startup' },
        { id: 'scale-up', label: 'Scale-up' },
        { id: 'big-tech', label: 'Big tech' },
        { id: 'enterprise', label: 'Enterprise' },
        { id: 'agency', label: 'Agency' },
        { id: 'in-house', label: 'In-house at a non-tech company' },
        { id: 'public-sector', label: 'Public sector' },
        { id: 'nonprofit', label: 'Nonprofit' },
        { id: 'self-employed', label: 'Self-employed' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    {
      kind: 'multi',
      id: 'sectors',
      text: 'What are the main sectors you work in?',
      hint: 'Multiple choice',
      // Alphabetical, with "Other…" kept last.
      order: 'alphaExceptLast',
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
        { id: 'automotive', label: 'Automotive' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    // The bonus round: optional written questions asked AFTER the
    // answers are sent (`afterSend` on the group — see bonus.ts), so
    // anyone who stops here has already sent everything else. Not a
    // numbered step.
    {
      kind: 'textarea',
      id: 'one-change',
      group: 'bonus',
      text: 'One thing you’d change about our industry?',
      optional: true,
      maxLength: 2000
    },
    {
      kind: 'textarea',
      id: 'admire',
      group: 'bonus',
      text: 'Who do you admire in your field? Why?',
      optional: true,
      maxLength: 1000
    },
    {
      kind: 'textarea',
      id: 'amazing-work',
      group: 'bonus',
      text: 'What’s one project or organisation that you think is amazing?',
      optional: true,
      maxLength: 1000
    }
  ]
};
