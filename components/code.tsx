// Include additional languages here
// --
import Prism from "prism-react-renderer/prism";
(typeof global !== "undefined" ? global : window).Prism = Prism;
require("prismjs/components/prism-rust")
// --

import Highlight, { defaultProps } from "prism-react-renderer";

import codeTheme from "./codeTheme";

export default function Code({ children, language }) {
  return (
    <div className="code">
      <Highlight
        {...defaultProps}
        theme={codeTheme}
        code={children}
        language={language}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <div className={className} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </div>
        )}
      </Highlight>
      <style jsx>{`
        .code {
          padding-top: 16px;
          padding-bottom: 16px;
        }
      `}</style>
    </div>
  );
}
