(() => {
  var s = document.currentScript;
  var endpoint = (s && s.getAttribute("data-endpoint")) || "/api/track";
  function track(e) {
    if (e.type === "auxclick" && e.button !== 1) return;
    if (e.type === "click" && e.button !== 0) return;
    var t = e.target;
    var a = t && t.closest && t.closest("a[href]");
    if (!a || typeof a.href !== "string" || !/^https?:$/.test(a.protocol))
      return;
    var d = { path: location.pathname, href: a.href };
    var l = a.getAttribute("data-analytics-label");
    if (l) d.label = l;
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, JSON.stringify(d));
  }
  document.addEventListener("click", track, true);
  document.addEventListener("auxclick", track, true);
})();
