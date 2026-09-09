---
title: 'Sample draft article to test article styling'
slug: 'sample-draft-article'

excerpt: "A short sample article used to verify that the article page styling generalizes correctly to articles that aren't book reviews."

author: 'Test Author'
authorSlug: 'test-author'

publishedAt: '2026-06-19'
updatedAt: '2026-06-14'

status: 'draft' # draft | review | published | unlisted

articleType: 'Article' # Article | Book Review | Podcast

topics:
  - careers
  - job-search

organizations:
  - Hard Problems

people: []

readingTime: 2

featured: false

image: '/images/content/thumb-moral-ambition-bregman.jpg'
imageAlt: 'Placeholder image'

seoTitle: ''
seoDescription: ''

canonicalUrl: ''
---

# Sample draft article to test article styling {#sample-draft-article}

_A short sample article used to verify that the article page styling generalizes correctly to articles that aren't book reviews._{.intro}

![Placeholder float-right image](/images/content/moral-ambition-book.jpg){.float-right}

This is the first body paragraph of a regular "Article"-type post (not a book review). The Book Review label that appears at the top of the Moral Ambition article shouldn't appear above this title.

The article body inherits the site-wide 18px font-size and uses cornflowerblue links — like [this link to the homepage](/) — without underlines. Hover should turn them dark blue.

## A standard H2 heading

H2 headings should render at 1.3rem with generous top margin (`calc(2.5rem + 1em)`) and 0.75rem below. The headings are bold body color, not uppercase.

A second paragraph after the H2 to verify spacing. The intro paragraph above uses the `{.intro}` class, which gets the 22px body-style intro treatment — no italics, no yellow background.

> “If I Had More Time, I Would Have Written a Shorter Letter” — Blaise Pascal

<div class="note">

**Note:** This is an important thing that I think users should be aware of.

</div>

## A second H2 with an inline list

Below is an unordered list to verify list styling:

- First bullet item
- Second bullet item with [an inline link](https://hardproblems.com)
- Third item with **bold** and _italics_

And an ordered list:

1. First numbered item
2. Second numbered item
3. Third numbered item

Followed by a code block:

```{.wrap-text}
This is the first sentence inside a fenced code block. This is the second sentence to verify that the block renders in monospace with appropriate spacing.
```

## A third H2 with a full-width image

The next image has no `{.float-right}` class, so it should sit inline at full width inside the article column:

![Placeholder inline image](/images/content/thumb-moral-ambition-bregman.jpg)

After the image, normal paragraph flow continues. This paragraph follows directly after the inline image.

## Topics & links

Below the body, the topics tags should appear as sentence-case pill links. For this article: **Careers** and **Tech for good**. Clicking them should jump to `/articles/topic/careers` and `/articles/topic/tech-for-good`.

Since this article has `status: draft`, it won't appear on the `/articles` listing page — but visiting `/articles/sample-draft-article` directly should still render it correctly.
