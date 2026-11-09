// The survey's interface text in English — the source every translation
// follows, and the definition of its keys (see SurveyUi in types.ts).
//
// Placeholders in braces are filled in by the form:
//   {n}, {total}, {minutes}, {copies}   numbers
//   {date}                              a date, already formatted
//   {title}, {authors}                  the prize book (kept in English)
//   {link}                              a link, whose words are the
//                                       neighbouring `…Link` string
//   {question}, {message}, {name}, {url}, {logo}  as named
// Keep every placeholder when translating; move it wherever the
// language's word order needs it.

export const EN_UI = {
  /** The language picker's accessible name. */
  languagePicker: 'Choose a language',
  /** Under the menu on the start page. */
  band: 'We are a nonprofit that helps designers to work on the world’s urgent problems.',
  kicker: 'Survey',

  start: {
    beforeYouStart: 'Before you start',
    minutes: '~{minutes} minutes to complete',
    anonymous: 'Answers are anonymous',
    book: 'You could win a free book (see below)',
    progress:
      'Your progress saves in this browser, so you can stop and come back',
    button: 'Start the survey',
    privacyHeading: 'Your privacy',
    privacy: [
      'All answers are anonymous. We do not ask who you are, and we do not record your IP address.',
      'We never ask for your email address. The survey stores no way of telling who sent an answer.',
      'To get the results, join our newsletter at the end. We will know you signed up from the survey, but your email is never linked to what you answered.'
    ],
    /** {link} is `privacyLinkText`. */
    privacyLine: 'See our {link} for how we handle this data.',
    privacyLinkText: 'privacy notice'
  },

  closed: {
    opensOn: 'This survey opens on {date}.',
    closedOn:
      'This survey closed on {date} and is no longer accepting responses. Thank you to everyone who took part.',
    /** {link} is `newsletterLinkText`. */
    hearWhenOpens:
      '{link} to hear when it opens, and when the results are published.',
    hearResults: '{link} to hear when the results are published.',
    newsletterLinkText: 'Join the newsletter'
  },

  header: {
    /** "Exit survey"; on a phone only `exit` shows. */
    exit: 'Exit',
    exitRest: ' survey',
    /** "{title} survey by Hard Problems." — {logo} is the Hard Problems logo. */
    surveyBy: 'survey by {logo}',
    privacy: 'Privacy',
    privacyRest: ' policy',
    back: 'Back',
    step: 'Step {n} of {total}'
  },

  actions: {
    continue: 'Continue',
    send: 'Send my answers',
    sending: 'Sending…',
    done: 'Done',
    skip: 'Skip this question'
  },

  errors: {
    generic: 'Something went wrong. Please try again in a moment.',
    network: 'We could not reach the server. Please try again.',
    tooMany: 'Too many requests. Please try again shortly.',
    closed: 'This survey is closed.',
    saveFailed: 'We could not save your answers. Please try again.',
    bonusExpired:
      'These can no longer be added to your answers. Thank you all the same.',
    /** An error message prefixed with the question it is about. */
    withQuestion: '“{question}”: {message}'
  },

  /** Returned by validation; shown on the question. */
  validation: {
    answerAgain: 'Please answer this question again.',
    answer: 'Please answer this question.',
    /** {question} is the question as shown. */
    answerNamed: 'Please answer “{question}”',
    chooseOne: 'Please choose one option.',
    chooseFromOptions: 'Please choose one of the options.',
    chooseAtLeastOne: 'Please choose at least one option.',
    chooseOnce: 'Please choose each option only once.',
    chooseListed: 'Please choose from the options listed.',
    chooseRating: 'Please choose a rating.',
    makeAllChoices: 'Please make all {n} choices.',
    chooseJobsShown: 'Please choose from the jobs shown.',
    chooseCountry: 'Please choose a country.',
    chooseCountryFromList: 'Please choose a country from the list.',
    write: 'Please write an answer.',
    specialCharacters: 'Please remove any special characters.',
    formulaStart: 'Please don’t start your answer with =, +, - or @.',
    tooLong: 'Please keep this under {n} characters.',
    sayOther: 'Please say what you mean by “Other”.'
  },

  fields: {
    chooseOne: 'Choose one',
    chooseCountry: 'Choose a country',
    sayMore: 'Please say more',
    optional: 'Optional',
    charsRemaining: {
      one: '{n} character remaining',
      other: '{n} characters remaining'
    }
  },

  jobs: {
    /** Screen readers only: the table's caption. */
    caption: 'Two jobs. Choose the one you would take.',
    firstJob: 'First job',
    secondJob: 'Second job',
    /** Screen readers only: the row name for the card title. */
    typeOfJob: 'Type of job',
    /** Joins two row names for screen readers: "Pay and Level". */
    and: ' and ',
    choose: 'Choose',
    chooseFirst: 'Choose the first job',
    chooseSecond: 'Choose the second job',
    vs: 'vs.',
    round: 'Round {n} of {total}',
    undo: 'Undo last choice',
    allDone: 'All {n} rounds done',
    again: 'Go back and choose jobs again'
  },

  prize: {
    heading: 'Win a free book',
    /** On the start page. {title} is set in italics. */
    startBody:
      'Finish the survey, then join the Hard Problems newsletter, and you could be one of {copies} people we send a copy of {title} by {authors}.',
    /** On the thank-you page. */
    doneBody:
      'Newsletter subscribers will be entered into a draw for one of {copies} copies of {title} by {authors}.',
    reviewLink: 'Read our review of the book',
    draw: 'We will draw {copies} newsletter subscribers randomly after the survey closes on {date}.',
    thanks:
      'Thank you to Scott and Bryan for gifting us the books to give out.',
    coverAlt: 'Cover of {title} by {authors}',
    termsSummary: 'Prize draw terms',
    /**
     * Only in translations: says the English terms are the binding
     * ones. Empty in English.
     */
    termsNote: '',
    terms: [
      'The promoter is Hard Problems, a nonprofit company limited by guarantee registered in England and Wales, company number 16028166.',
      'No purchase is necessary. Entry is free.',
      'The draw is open to anyone aged 18 or over, except our directors, staff and contractors and their immediate families. It is void where prohibited by local law.',
      'To enter, subscribe to the Hard Problems newsletter on or before {date}. We ask that you complete the survey first, but because survey responses are anonymous we cannot check whether you have, and we do not. Existing subscribers on that date are entered automatically. One entry per person.',
      'There are {copies} prizes. Each is one copy of {title} by {authors}. There is no cash alternative and prizes are not transferable.',
      'Winners are selected at random from all eligible entries within 14 days of the closing date, and contacted at the email address they subscribed with.',
      'A winner has 28 days to reply with a postal address. If they do not, we draw a replacement.',
      'We post prizes worldwide at our own cost. Any import duty or local tax is the winner’s responsibility.',
      'We use a winner’s email and postal address only to send the prize, and delete the postal address once it has been sent. See our {link}.',
      '{authors} kindly donated the books. The draw is run entirely by Hard Problems; neither they nor their publisher administer it or choose the winners.',
      'Entering means accepting these terms. The draw is governed by the law of England and Wales.'
    ],
    privacyLinkText: 'privacy notice'
  },

  done: {
    title: 'Thank you!',
    resultsHeading: 'Get the results in December',
    /** {link} is `newsletterLinkText`. */
    resultsBody:
      'We did not ask for your email, so your answers stay anonymous. To hear when the report is published, join our {link}.',
    newsletterLinkText: 'newsletter',
    shareHeading: 'Help us reach more people',
    shareBody:
      'Please share this link on social media. The more people who answer this survey, the better the report.',
    /** The text people share. {url} is the survey link. */
    shareText:
      'I just took the Hard Problems survey about design and product careers. Let’s find out what we think makes a career satisfying. {url} Please re-share.',
    copy: 'Copy text',
    copied: 'Copied',
    shareOr: 'Or share it on',
    shareOn: 'Share on {name}',
    emailSubject: 'A survey about design and product careers'
  },

  newsletter: {
    placeholder: 'Your email...',
    emailLabel: 'Your email address',
    subscribe: 'Subscribe',
    subscribing: 'Subscribing',
    successTitle: 'Thank you',
    successBody: 'You are now subscribed.',
    errorTitle: 'Something went wrong',
    errorBody: 'Couldn’t subscribe you. Please try again.',
    networkError: 'Couldn’t reach the newsletter service. Please try again.',
    done: 'Done',
    tryAgain: 'Try again',
    close: 'Close'
  }
} as const;
