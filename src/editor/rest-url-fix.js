  // Plain permalinks: REST base is "index.php?rest_route=/ns/v1", so code that appends
  // "?param=" produces a second "?" and a 404. Normalize those URLs before fetch() runs.
  (function lbRestUrlFix() {
    const orig = window.fetch;
    if (typeof orig !== "function" || orig.__lbRestFix) return;
    const fix = (url) => {
      if (typeof url !== "string" || url.indexOf("rest_route=") < 0) return url;
      const first = url.indexOf("?");
      if (first < 0) return url;
      return url.slice(0, first + 1) + url.slice(first + 1).replace(/\?/g, "&");
    };
    const wrapped = function(input, init) {
      if (typeof input === "string") input = fix(input);
      else if (input && typeof URL !== "undefined" && input instanceof URL) input = fix(input.href);
      return orig.call(this, input, init);
    };
    wrapped.__lbRestFix = true;
    window.fetch = wrapped;
  })();
