---
title: 'Design at Resolve to Save Lives'
slug: 'design-at-resolve-to-save-lives'

excerpt: 'What do designers do at a nonprofit working on global public health? Tony Joy on hypertension and the 80% of design work that happens outside of Figma.'

author: 'Tony Joy'
authorSlug: 'tony-joy'

publishedAt: '2026-09-01'
updatedAt: '2026-09-01'

status: 'published' # draft | review | published

articleType: 'Interviews' # Article | Book reviews | Podcast | Interviews

topics:
  - public-health
  - careers
  - healthcare

organizations:
  - Resolve to Save Lives
  - Simple
  - Hard Problems

people:
  - Tony Joy
  - Daniel Burka

readingTime: 10

featured: false

image: '/images/content/thumb-resolve-to-save-lives-design.jpg'
imageAlt: 'A health worker using a tablet alongside paper patient registers'

seoTitle: 'Design at Resolve to Save Lives: an interview with Tony Joy'
seoDescription: 'Tony Joy, senior product designer at Resolve to Save Lives, on what a design team does at a global public health charity — and how design helps prevent heart attacks and strokes.'

canonicalUrl: ''
---

# Design at Resolve to Save Lives {#design-at-resolve-to-save-lives}

_What do designers do at a nonprofit working on global public health? Tony Joy on hypertension and the 80% of design work that happens outside of Figma._{.intro}

[Resolve to Save Lives](https://rtsl.org) is a public health charity that aims to save 100 million people from heart attacks and strokes in the next 30 years. What does a design team at a public health NGO do? Hard Problems' [Daniel Burka](/authors/daniel-burka) interviewed [Tony Joy](https://www.linkedin.com/in/tony-joy/), senior product designer, and their design and product team.

- **Design/product org size:** 6 people (2 designers, 1 UX researcher, 3 PMs)
- **Org size:** ~200 people
- **Sector and type:** Global health organization (Charity)
- **Founded:** 2017 by Dr. Tom Frieden, former director of the US CDC
- **Location:** USA, with offices in China, India, Nigeria, Ethiopia, and Rwanda

## What does the design team do at Resolve to Save Lives? {#what-does-the-design-team-do}

A lot of it is making public health tools work in places where people are already very busy.

In India, a doctor can see more than 200 patients in a day. So we built an Android app called [Simple](https://simple.org) that reduced the time to record a hypertension follow-up from more than 10 minutes to less than 20 seconds.

In Indonesia, most health facilities already have digital systems. The problem was that every EHR vendor had to build its own hypertension and diabetes dashboard. That was months of work per EHR. We built a small tool that works alongside their existing systems and gets a dashboard live in less than two days.

In summary, we make digital systems for managing patients in chronic disease programs around the world. And, in countries where good digital health systems already exist, we help the software vendors to make their software work better for chronic disease management.

## How is hypertension a meaningful problem? {#how-is-hypertension-a-meaningful-problem}

Heart disease kills around 20 million people every year — more than all communicable diseases like TB, malaria, HIV, etc. combined. And high blood pressure (i.e. hypertension) is the biggest driver of heart disease. About 1.4 billion people live with hypertension and only about 1 in 5 have it under control.

Most of these people feel healthy for years while high blood pressure quietly damages their heart, brain and kidneys. And eventually, it leads to a heart attack or stroke. It's a meaningful problem because much of this suffering is preventable. We know that simple, evidence-based solutions can save more than 3 million lives every year.

Tech and design don't solve hypertension, but they play important roles.

## Can good design actually save lives? {#can-good-design-actually-save-lives}

I don't think good design alone can save lives. But together with a good public health program, it definitely can.

Hypertension is a lifelong disease. So it's not enough for a patient to be diagnosed and given medicine once. A good hypertension program needs to:

1. Bring patients back every month for medication refills and blood pressure checks.
2. Adjust medicines until the patient's blood pressure is under control.

In a typical program without a good digital system, almost 60% of patients never come back. For patients who do return, the doctor has about two minutes with each patient, much of which is spent recording data for reporting rather than treating the patient in front of them.

A well-designed system gives time back to patients, doctors, and nurses. A 2023 study showed that the Simple app saved healthcare workers 24 minutes every workday.

The other side is what happens to the data afterwards. A good system also shows what's working well and what needs to be improved so efforts are directed at the right problems.

Good design also helps doctors make better decisions by showing relevant information and recommendations. For example, for a hypertension patient, a doctor needs to quickly see a history of blood pressure readings, current medicines, and whether the patient is taking meds correctly to then decide which medicine to prescribe.

## The most interesting challenge you tackled this year? {#the-most-interesting-challenge}

The first step in establishing good practices for hypertension and diabetes management is getting visibility into the current state of the public health program.

In Indonesia, almost all health data is recorded at the point of care in digital systems. But Indonesia's health system is decentralized with thousands of districts. Each district is free to choose its own electronic health record (EHR) system. Our challenge was to get data from all these different EHRs into a central dashboard so that the Ministry of Health can drive systemic change across the nation's hospitals.

For two years, we worked with some of the largest EHR vendors in Indonesia to build hypertension and diabetes dashboards inside their EHRs. But the process was taking too long, the dashboards had errors in indicator calculations, and it required a lot of coordination.

Our first plan was to create a dashboard template that EHRs could use as a reference ([hearts360.org](https://hearts360.org)). But even with the template and sample code, development took too long and the dashboard got a lot of calculations wrong.

We realized that instead of trying to change the existing way of working or improve the usability of existing systems, it was more effective to create a parallel system that connects to the EHRs.

We built a tool using open-source software that EHRs could integrate with so they could immediately visualise their data. EHR software developers take anywhere from a few hours to less than two days to complete the integration and start sending data to the tool.

Today, the dashboard monitors more than one million patients, and we are working to hand over the project to the Indonesian government.

## How big is the design and product team? {#how-big-is-the-team}

The whole product, design, research and engineering team is about 4% of RTSL's ~200 staff. The rest are public health experts, country teams, and support staff. It's all about collaboration between public health experts and technologists.

## What was everyone doing before this? Why work in public health? {#why-work-in-public-health}

**Tony Joy, Senior Product Designer, Bangalore, India:** I worked as a mechanical engineer for two years, then moved into marketing and eventually user experience design. I got into public health after seeing a talk by the Simple team about how good digital tools can save lives. I left my job at a startup and joined the RTSL digital team because it seemed like an interesting and meaningful challenge.

**Jamie Carter, Product Designer, Derby, UK:** I worked as a pharmacist for over a decade, managing a community pharmacy. This hands-on experience revealed how poorly designed software can impact professionals, organizations, and, ultimately, the patient in front of me. With a drive to help people improve their health and a passion for design, I moved into public health to build tools that improve health outcomes far beyond what one pharmacy counter could reach.

**Chetan Kanadka, Senior Design Researcher, Bangalore, India:** I'm a mechanical engineer specializing in product design and have worked across the automobile, agriculture, and social sectors. I first got into public health through an OpenCRVS project in Bangladesh, where I saw the need for simple, well-designed tools that work for health workers. I joined RTSL because I was excited by the chance to use research-led design to build digital tools around the real needs of health workers and improve care at scale.

**Varshana Rajasekaran, PM, London, UK:** I have worked in healthcare for the last 10 years. Working at the intersection of technology and making good quality health care more accessible has always been my passion. Working at RTSL is really exciting as the organization is very outcome focused and has a good team to deliver these. RTSL is rather unique as it has a cross-functional tech team (design, user research, product management and engineers) working alongside program managers and clinicians to improve hypertension outcomes.

**Bolatito Ogbeide, PM, Abuja, Nigeria:** I worked as a project manager for nine years in a software development organization, and our projects spanned different industries from finance to data archival systems. But I hadn't really done projects in the health space, and I got curious. I did a short stint at a health tech organization and saw firsthand how solutions designed for the health sector were a lot more impactful; we were no longer tracking just numbers, but each number was an actual human life.

**Abhishek Sudhakar, PM, Bangalore, India:** I worked as a software developer for about five years building operating systems for network devices before transitioning into product management about seven years ago. I started off in product by working in a consumer tech startup working on search and discovery. I mainly got into public health to work with a couple of close batchmates from college, but was eventually struck by the impact and the complexity of the problems, both of which have kept me in this field for six years and counting.

## How do you work with other people in the org? {#how-do-you-work-with-others}

Product, design, user research, and engineering together make up only about 4% of RTSL. The rest of the organization is made up of public health experts working on program implementation and scale-up, improving health service delivery, and medicine access.

We also work closely with external partners and ministries of health, including government tech teams, public health specialists, ministers and NCD officials, and insurance providers. On top of that, we coordinate with internal teams like legal and communications.

All of this has to line up for a country partnership to work, move from pilot to scale, and eventually be adopted by the government. Even if a pilot is successful, it won't scale if it doesn't fit how the government wants to run the programme.

A lot of the work is finding a middle ground. RTSL's president, Tom Frieden, has strong credibility in global health, and his engagement with senior government officials often helps open doors for scaling conversations.

A typical project looks like this:

- We set up a country partnership with the ministry of health or another organisation already working on NCD programmes.
- A user researcher goes into the field to understand where digital tools can actually help in pilot sites.
- We test prototypes, make small improvements, and try to show early results in those sites.
- Then public health and technology teams meet with stakeholders like the head of NCDs, the government digital team, and the national insurance provider to align on how to scale the program.

## Is design different here compared to a traditional tech org? {#is-design-different-here}

I'd say the main difference is that lives saved from premature death is the key indicator for success, not revenue.

The systems we design are also highly dependent on the health program, its challenges, and its priorities. Patient wait time is a huge challenge in India and Bangladesh. But in Indonesia, the challenge is aligning thousands of decentralized districts to follow standard treatment protocols.

We spend a lot of time in the field, observing current facility workflows and talking to healthcare staff, to figure out what the best digital interventions can be.

## One belief you have that might be unpopular? {#one-unpopular-belief}

Sometimes we'll launch an intervention or feature and nothing will change for months. And it's easy to say, "Oh, the health staff are lazy or not technical," or that the government doesn't show enough initiative.

But good design doesn't just put solutions into a void and wait for results. It also creates the environment where the solution can actually work.

> Bad results are often an indicator of a badly designed system, rather than a lack of initiative from the people using it.

## Advice for a designer who wants to work in this space? {#advice-for-designers}

Only about 20% of the work I do happens in Figma. Get comfortable with the idea that working in public health involves a lot of work around the work.

But the pieces you move are big, affecting millions of lives.

Jobs in this space are hard to find, but they're out there. Hard Problems has an excellent [job board](/jobs). A lot of projects like OpenSRP, DHIS2 and Simple are also open source and you might be able to contribute as an open source volunteer.

And today, with AI, it's much easier for designers to directly contribute code, rather than just designs.

## Advice for a public health org that wants to leverage design? {#advice-for-public-health-orgs}

Most good design is just rapid testing of ideas with end users.

![Sketch of a designer sitting with a nurse in a clinic, watching her use an app: "Should I click on this button?" "What do you think? I'm trying to see what you'd do in a real clinic."](/images/content/resolve-to-save-lives-sketch.jpg)

If we're making a decision that affects a nurse sitting inside a clinic in rural India, we take our designs to the nurse and watch them use the software. We never ask, "Do you like this software?"

My first recommendation would be to hire a designer, ideally someone who has interacted a lot with end users and spent time in the field. I'd also suggest a regular practice of testing your assumptions:

1. List 2–3 key tasks in your system or software that are essential for driving outcomes. For example, recording a patient follow-up visit.
2. Build a prototype around those tasks.
3. Give the prototype to five end users and watch them complete the tasks without any guidance.

This [blog post on user testing](https://www.simple.org/blog/fast-and-simple-user-testing-for-healthcare/) has more detailed steps and templates.

## What skills do you use that design training didn't teach you? {#skills-design-training-didnt-teach}

A big chunk of the 80% of my job that happens outside Figma is convincing engineering, public health, and government teams why a certain design would work, why something wouldn't work, and, if needed, finding a middle ground. You should be able to explain and justify every design decision to different audiences, even when they come from very different backgrounds and ways of thinking.

## Name one designer who inspires you? {#one-designer-who-inspires-you}

[Hannah Ritchie](https://hannahritchie.com/), editor at [Our World in Data](https://ourworldindata.org).

She also wrote an excellent book called _Not the End of the World_, similar in positive tone to _Factfulness_ by Anna and Hans Rosling. It uses simple graphs to explain the latest data around climate. My favorite chart by her is the one on [causes of death](https://ourworldindata.org/causes-of-death).

<div class="note">

**This interview is part of a series:** We talk to designers, researchers, and product people about what it's really like to work on hard problems. Get the next one by signing up to our [email newsletter](/newsletter).

</div>
