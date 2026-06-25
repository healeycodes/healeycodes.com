(function (Prism) {
	Prism.languages.kernel = {
		"comment": {
			pattern: /#.*/,
			greedy: true,
		},
		"string": {
			pattern: /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/,
			greedy: true,
		},
		"keyword": /\b(?:kernel|for|vector_for|in|let)\b/,
		"builtin": /\b(?:range|masked_load|masked_store|gather|lane_id)\b/,
		"constant": /\b(?:LANES|UNIFORM|VARYING)\b/,
		"boolean": /\b(?:true|false|True|False)\b/,
		"function": {
			pattern: /\b[A-Za-z_]\w*(?=\s*\()/,
		},
		"number": /\b-?\d+(?:\.\d+)?\b/,
		"operator": /->|==|!=|<=|>=|\+|-|\*|\/|%|=|<|>/,
		"punctuation": /[()[\]{},:]/,
	};
})(Prism);
