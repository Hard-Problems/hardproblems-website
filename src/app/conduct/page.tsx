import Link from 'next/link';

export default function Page() {
  return (
    <>
      <section className="left">
        <h1 className="page-title">Code of conduct</h1>
        <p>
          In the interest of fostering an open and welcoming environment, we
          as contributors and maintainers pledge to making participation in
          our project and our community a harassment-free experience for
          everyone, regardless of age, body size, disability, ethnicity, sex
          characteristics, gender identity and expression, level of
          experience, education, socio-economic status, nationality,
          personal appearance, race, religion, or sexual identity and
          orientation.
        </p>

        <h3 className="space-top-large">Our standards</h3>
        <p>
          Examples of behavior that contributes to creating a positive
          environment include:
        </p>
        <ul>
          <li>Using welcoming and inclusive language</li>
          <li>Being respectful of differing viewpoints and experiences</li>
          <li>Gracefully accepting constructive criticism</li>
          <li>Focusing on what is best for the community</li>
          <li>Showing empathy toward other community members</li>
        </ul>
        <p className="space-top-small">Examples of unacceptable behavior by participants include:</p>
        <ul>
          <li>
            The use of sexualized language or imagery and unwelcome sexual
            attention or advances
          </li>
          <li>
            Trolling, insulting/derogatory comments, and personal or
            political attacks
          </li>
          <li>
            Public or private harassment
          </li>
          <li>
            Publishing others’ private information, such as a physical or
            electronic address, without explicit permission
          </li>
          <li>
            Other conduct which could reasonably be considered inappropriate
            in a professional setting
          </li>
        </ul>

        <h3 className="space-top-large">Our responsibilities</h3>
        <p>
          Leaders are responsible for clarifying the standards
          of acceptable behavior and are expected to take appropriate and
          fair corrective action in response to any instances of
          unacceptable behavior.
        </p>
        <p>
          Leaders have the right and responsibility to remove,
          edit, or reject comments, commits, code, wiki edits, issues, and
          other contributions that are not aligned to this Code of Conduct,
          or to ban temporarily or permanently any contributor for other
          behaviors that they deem inappropriate, threatening, offensive, or
          harmful.
        </p>

        <h3 className="space-top-large">Scope</h3>
        <p>
          This Code of Conduct applies both within project spaces and in
          public spaces when an individual is representing the project or
          its community. Examples of representing a project or community
          include using an official project e-mail address, posting via an
          official social media account, or acting as an appointed
          representative at an online or offline event. Representation of a
          project may be further defined and clarified by project
          maintainers.
        </p>

        <h3 className="space-top-large">Enforcement</h3>
        <p>
          Instances of abusive, harassing, or otherwise unacceptable
          behavior may be reported by contacting the project team at{' '}
          <Link href="mailto:contact@hardproblems.com">
            contact@hardproblems.com
          </Link>
          . All complaints will be reviewed and investigated and will result
          in a response that is deemed necessary and appropriate to the
          circumstances. The project team is obligated to maintain
          confidentiality with regard to the reporter of an incident.
          Further details of specific enforcement policies may be posted
          separately.
        </p>
        <p>
          Leaders who do not follow or enforce the Code of
          Conduct in good faith may face temporary or permanent
          repercussions as determined by other members of the project’s
          leadership.
        </p>
      </section>
      <section className="right">
        <h3>Attribution</h3>
        <p>
          This Code of Conduct is adapted from the Contributor Covenant,
          version 1.4,{' '}
          <Link href="https://www.contributor-covenant.org/version/1/4/code-of-conduct.html">
            available here
          </Link>
          .
        </p>
        <p>
          For answers to common questions about this code of conduct, see{' '}
          <Link href="https://www.contributor-covenant.org/faq">this FAQ</Link>.
        </p>
      </section>
    </>
  );
}
