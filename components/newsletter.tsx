import siteConfig from "../siteConfig.json";

export default function Newsletter() {
  const after = () =>
    window.open(
      `https://buttondown.email/${siteConfig.BUTTON_DOWN_USER}`,
      "popupwindow"
    );
  return (
    <div className="newsletter-section">
      <p className="newsletter-desc">
        Subscribe to new posts by email. Something new approximately once per
        month.
      </p>
      <form
        action={`https://buttondown.email/api/emails/embed-subscribe/${siteConfig.BUTTON_DOWN_USER}`}
        method="post"
        target="popupwindow"
        onSubmit={after}
        className="embeddable-buttondown-form"
      >
        <div className="control">
          <input
            required
            className="email"
            placeholder="adalovelace@gmail.com"
            type="email"
            name="email"
            id="bd-email"
          />
          <input type="hidden" value="1" name="embed" />
          <input className="subscribe" type="submit" value="Subscribe" />
        </div>
      </form>
      <style jsx>{`
        .newsletter-section {
          margin-top: 20px;
          padding-left: 16px;
          padding-right: 16px;
          padding-bottom: 16px;
          border: 1px solid var(--text-muted);
          border-radius: 0.25rem;
        }
        .newsletter-desc {
          color: var(--text-main);
        }
        .control {
          display: flex;
        }
        .email {
          min-width: 150px;
        }
        .subscribe {
          border-radius: 0.25rem;
          border-width: 1px;
          min-width: 8rem;
        }
        @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
          .control {
            display: block;
          }
          .email {
            width: calc(100% - 21px);
          }
          .subscribe {
            margin-top: 8px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
