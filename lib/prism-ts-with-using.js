(function (Prism) {
	const tsWithUsing = Prism.languages.extend("typescript", {});
	tsWithUsing.keyword.unshift(/\busing\b/);

	Prism.languages["ts-with-using"] = tsWithUsing;
})(Prism);
