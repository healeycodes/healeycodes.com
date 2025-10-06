(function (Prism) {
	Prism.languages.forth = {
		"comment": {
			pattern: /\\\s.*$/m,
			greedy: true,
		},
		"string": {
			pattern: /"(?:[^"\\]|\\.)*"/,
			greedy: true,
		},
		"number": /\b-?\d+(?:\.\d+)?\b/,
		"keyword":
			/\b(?:VARIABLE|DO|LOOP|IF|THEN|ELSE|BEGIN|UNTIL|WHILE|REPEAT)\b/i,
		"builtin":
			/\b(?:@|!|\+|-|\*|\/|MOD|=|<|>|AND|OR|NOT|DUP|DROP|SWAP|OVER|ROT|\.)\b/,
		"definition": {
			pattern: /(:)\s+(\S+)/,
			lookbehind: true,
			inside: {
				"keyword": /^:/,
				"function": /\S+/,
			},
		},
		"variable": /\b[A-Z]+\b/,
		"punctuation": /[;]/,
	};
})(Prism);
