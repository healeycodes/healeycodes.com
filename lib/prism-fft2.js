(function (Prism) {
	Prism.languages.fft2 = {
		"comment": {
			pattern: /#.*/,
			greedy: true,
		},
		"string": {
			pattern: /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/,
			greedy: true,
		},
		"keyword": /\b(?:for|in|if|else|while|return|break|continue|and|or|not)\b/,
		"boolean": /\b(?:true|false)\b/i,
		"function": /\b[a-zA-Z_]\w*(?=\s*\()/,
		"property": {
			pattern: /(\.)[a-zA-Z_]\w*/,
			lookbehind: true,
		},
		"number": /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/i,
		"operator": /<=|>=|==|!=|=|[+\-−*/&|<>]/,
		"punctuation": /[()[\]{},.:]/,
	};
})(Prism);
