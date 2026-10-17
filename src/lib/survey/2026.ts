// The 2026 State of Design survey.
//
// Pure data — see types.ts for why. To run this again next year, copy
// this file to 2027.ts, change the dates, adjust the questions, and
// register it in index.ts. Keep question and option ids identical for
// anything you want to compare year over year; reword labels freely.

import type { SurveyDefinition } from './types';

// Likert questions all share the same 0–5 shape, so the only thing that
// varies is the wording at each end.
function likert(id: string, text: string, lowLabel: string, highLabel: string) {
  return { kind: 'likert' as const, id, text, lowLabel, highLabel };
}

export const SURVEY_2026: SurveyDefinition = {
  year: 2026,
  title: 'The State of Design 2026',
  intro:
    'A survey of how designers, researchers, writers and product people feel about their work. It takes about five minutes, and every answer is anonymous.',
  image: '/images/content/thumb-survey-2026.jpg',
  opensAt: '2026-10-16T00:00:00.000Z',
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
    illustrator: 'illustration',
    'motion-designer': 'motion design',
    'service-designer': 'service design',
    'industrial-designer': 'design',
    'design-researcher': 'design research',
    'ux-designer': 'design',
    'ui-designer': 'design',
    'design-writer': 'writing',
    'product-manager': 'product management',
    founder: 'startups',
    other: 'design'
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
        { id: 'graphic-designer', label: 'Graphic/Brand Designer' },
        { id: 'illustrator', label: 'Illustrator' },
        { id: 'motion-designer', label: 'Motion Designer' },
        { id: 'service-designer', label: 'Service Designer' },
        { id: 'industrial-designer', label: 'Industrial Designer' },
        { id: 'design-researcher', label: 'Design Researcher' },
        { id: 'ux-designer', label: 'UX Designer' },
        { id: 'ui-designer', label: 'UI Designer' },
        { id: 'design-writer', label: 'Writer' },
        { id: 'product-manager', label: 'Product Manager' },
        { id: 'founder', label: 'Founder' },
        { id: 'other', label: 'Other…', isOther: true }
      ]
    },

    likert(
      'career-satisfaction',
      'How satisfied are you in your career?',
      'Not satisfied at all',
      'Extremely satisfied'
    ),
    likert(
      'role-security',
      'How secure do you feel in your current role?',
      'Very insecure',
      'Rock solid'
    ),
    likert(
      'skill',
      'Are you skilled at your chosen career?',
      'Unskilled',
      'Very highly skilled'
    ),
    likert(
      'passion',
      'Are you passionate about your chosen career?',
      'Not passionate',
      'Extremely passionate'
    ),
    likert(
      'pay',
      'Do people in your career make enough money?',
      'Underpaid',
      'Extremely well paid'
    ),
    likert(
      'benefit-to-world',
      'Does your career feel like it benefits the world?',
      'Not at all',
      "Yes, it's very beneficial"
    ),

    {
      kind: 'multi',
      id: 'what-matters',
      text: 'What matters most to you?',
      hint: 'Choose up to three.',
      max: 3,
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
      'Not working in this field',
      'Definitely working in this field'
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

    likert(
      'ai-usage',
      'How much is AI being used in your day-to-day work?',
      "I don't use AI",
      'I use AI most of the time'
    ),

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

    {
      kind: 'single',
      id: 'manages-people',
      text: 'Do you manage people?',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    },

    {
      kind: 'single',
      id: 'experience',
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
      text: 'Where are you in the world?'
    },

    {
      kind: 'single',
      id: 'org-type',
      text: 'What type of organisation do you work at?',
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
      kind: 'single',
      id: 'org-size',
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
      kind: 'textarea',
      id: 'one-change',
      text: 'If you could change one thing about the design industry, what would it be?',
      hint: 'Optional — you can skip this and finish.',
      optional: true,
      maxLength: 2000
    }
  ]
};
