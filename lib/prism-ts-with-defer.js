(function (Prism) {
	const tsWithDefer = Prism.languages.extend("typescript", {});
	tsWithDefer.keyword.unshift(/\bdefer\b/);

	Prism.languages["ts-with-defer"] = tsWithDefer;
})(Prism);
