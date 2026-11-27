// The surf bot's score, as written in posts/the-math-behind-counter-strike-surfing.md (```goal-surf)
(function (Prism) {
	Prism.languages["goal-surf"] = {
		"comment": { pattern: /#.*/, greedy: true },
		"keyword": /\bgoal\b/,
		"function": /\b(?:distance_to_go|horizontal_speed|speed_along_route|speed|z)\b/,
		"number": /\b\d+(?:\.\d+)?\b/,
		"operator": /[+\-*\/=]/,
		"punctuation": /[()]/,
	};
})(Prism);
