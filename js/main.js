/* ============================================================
   Fall of the Foul — MAIN (boot)
   ============================================================ */
(function (G) {
  "use strict";
  function boot() {
    if (!G.load()) G.newGame();
    G.UI.init();
    G.UI.showScreen("home");
    // keep the home portrait crisp after fonts/layout settle
    setTimeout(function () { if (document.getElementById("s-home").classList.contains("active")) G.UI.renderHome(); }, 150);
    window.addEventListener("resize", function () {
      if (document.getElementById("s-home").classList.contains("active")) G.UI.renderHome();
    });
    // prevent pinch-zoom / double-tap zoom
    document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
    var lastTouch = 0;
    document.addEventListener("touchend", function (e) {
      var n = Date.now(); if (n - lastTouch < 300) e.preventDefault(); lastTouch = n;
    }, { passive: false });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
