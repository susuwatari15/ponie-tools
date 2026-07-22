// Set the theme class before first paint to avoid a light-mode flash.
// Keys mirror src/constants/theme-storage.ts — keep them in sync.
(function () {
	try {
		var k = "swagger-shorter-theme",
			l = "permission-diff-theme";
		var t = localStorage.getItem(k) || localStorage.getItem(l);
		if (t !== "light" && t !== "dark") {
			t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		if (t === "dark") {
			document.documentElement.classList.add("dark");
		}
	} catch (e) {}
})();
