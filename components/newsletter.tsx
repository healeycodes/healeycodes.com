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
        Subscribe to my new posts (about once a month).
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
          border: 1px solid var(--border);
          border-radius: 0.4rem;
        }
        .newsletter-desc {
          margin-bottom: 16px;
        }
        .control {
          display: flex;
          max-width: 500px;
        }
        .email {
          width: 212px;
          border: 0 solid;
          border-color: var(--border);
          font-family: inherit;
          display: block;
          border-radius: 0.4rem;
          border-width: 1px;
          background-color: var(--input-background);
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
          font-weight: 400;
          margin-right: 0.5rem;
          outline: none;
        }
        .subscribe {
          appearance: none;
          font-family: inherit;
          cursor: pointer;
          border-radius: 0.4rem;
          border-width: 1px;
          border-color: transparent;
          vertical-align: middle;
          font-size: 1rem;
          line-height: 1.5rem;
          padding: 0.375rem 0.75rem;
          background-color: var(--button);
          font-weight: 500;
          color: var(--button-text);
          min-width: 8rem;
        }
        @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
          .control {
            display: block;
          }
          .email {
            width: 100%;
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
