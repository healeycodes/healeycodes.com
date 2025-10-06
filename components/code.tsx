// Include additional languages here
// --
import Prism from "prism-react-renderer/prism";
(typeof global !== "undefined" ? global : window).Prism = Prism;
require("prismjs/components/prism-rust")
require("prismjs/components/prism-lua")
require("prismjs/components/prism-lisp")
require("../lib/prism-forth")
// --

import Highlight, { defaultProps, Language } from "prism-react-renderer";

import codeTheme from "./codeTheme";

interface CodeOptions {
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export default function Code({ children, language, options = { showLineNumbers: false, highlightLines: [] } }: { children: any, language: Language, options?: CodeOptions }) {
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
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i });
              return (
                <div 
                  key={i} 
                  {...lineProps}
                  className={`${lineProps.className} code-line ${options.highlightLines?.includes(i) ? 'highlighted' : ''}`}
                >
                  {options.showLineNumbers && <span style={{ color: "var(--light-text)", paddingRight: 15 }}>{i + 1}</span>}
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Highlight>
      <style jsx>{`
        .code-line {
          transition: background-color 0.2s;
          padding-left: 0.75rem;
        }

        .code-line.highlighted {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
