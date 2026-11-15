// Aperçus animés : une petite scène SVG par projet. Les chaînes ci-dessous sont écrites ici (aucune donnée externe),
// les animations sont dans hub.css (classes a-*), et ne tournent que lorsque la carte est visible.
(function () {
  "use strict";
  var H = window.Hub;
  if (!H) return;
  var V = {};

  V["bots-telegram"] =
    '<rect class="f2" x="10" y="9" width="84" height="16" rx="8"/><rect class="t" x="20" y="15" width="40" height="3" rx="1.5"/>' +
    '<rect class="f1 a-pop" style="--d:.4s" x="64" y="31" width="86" height="16" rx="8"/><rect class="k" x="76" y="37" width="46" height="3" rx="1.5"/>' +
    '<g class="a-pop" style="--d:1s"><rect class="o" x="10" y="55" width="40" height="13" rx="4"/><rect class="o" x="56" y="55" width="40" height="13" rx="4"/><rect class="f1 a-blink" x="102" y="55" width="40" height="13" rx="4"/></g>' +
    '<g class="a-pop" style="--d:1.8s"><path class="f2" d="M118 72h30v14l-4-3-4 3-4-3-4 3-4-3-4 3-3-3z"/></g>';

  V["flipper-keymanager"] =
    '<rect class="o" x="38" y="10" width="72" height="68" rx="12"/><rect class="f2" x="47" y="19" width="54" height="26" rx="4"/>' +
    '<g><circle class="f1 a-pop" style="--d:.2s" cx="56" cy="32" r="3"/><circle class="f1 a-pop" style="--d:.5s" cx="67" cy="32" r="3"/><circle class="f1 a-pop" style="--d:.8s" cx="78" cy="32" r="3"/><circle class="f1 a-pop" style="--d:1.1s" cx="89" cy="32" r="3"/></g>' +
    '<circle class="o" cx="60" cy="62" r="8"/><circle class="f1 a-pulse" cx="92" cy="62" r="5"/>' +
    '<path class="o" d="M110 44h26"/><rect class="f2" x="136" y="38" width="14" height="12" rx="2"/><circle class="f1 a-travel" cx="112" cy="44" r="2.5"/>';

  V["spotyfiles"] =
    '<circle class="o" cx="36" cy="45" r="24"/><path class="o a-spin" d="M36 45V28"/><path class="o a-spin-slow" d="M36 45l11 6"/><circle class="f1" cx="36" cy="45" r="2.5"/>' +
    '<rect class="f2 a-rise" style="--d:0s" x="76" y="46" width="10" height="30" rx="2"/><rect class="f1 a-rise" style="--d:.3s" x="92" y="28" width="10" height="48" rx="2"/>' +
    '<rect class="f2 a-rise" style="--d:.6s" x="108" y="38" width="10" height="38" rx="2"/><rect class="f1 a-rise" style="--d:.9s" x="124" y="20" width="10" height="56" rx="2"/><path class="o" d="M70 78h82"/>';

  V["pokemonbot"] =
    '<rect class="o" x="14" y="10" width="46" height="66" rx="6"/><rect class="f2" x="20" y="16" width="34" height="30" rx="3"/><rect class="f2" x="20" y="52" width="22" height="3" rx="1.5"/><rect class="f2" x="20" y="59" width="30" height="3" rx="1.5"/>' +
    '<rect class="f1 a-sweepy" x="14" y="10" width="46" height="3"/>' +
    '<rect class="f2" x="76" y="16" width="70" height="12" rx="3"/><rect class="f2" x="76" y="34" width="70" height="12" rx="3"/><rect class="o a-blink" x="76" y="52" width="70" height="12" rx="3"/>' +
    '<circle class="o a-ring" cx="140" cy="76" r="5"/><circle class="f1" cx="140" cy="76" r="3"/>';

  V["skills-agents"] =
    '<g class="o" style="opacity:.55"><path d="M80 45L32 22M80 45L30 66M80 45L130 18M80 45L134 62M80 45L106 80"/></g>' +
    '<circle class="f1 a-pulse" cx="80" cy="45" r="9"/>' +
    '<circle class="f2 a-pulse" style="--d:.3s" cx="32" cy="22" r="6"/><circle class="f2 a-pulse" style="--d:.7s" cx="30" cy="66" r="6"/><circle class="f2 a-pulse" style="--d:1.1s" cx="130" cy="18" r="6"/>' +
    '<circle class="f2 a-pulse" style="--d:1.5s" cx="134" cy="62" r="6"/><circle class="f2 a-pulse" style="--d:1.9s" cx="106" cy="80" r="5"/>';

  V["password-analyzer"] =
    '<g class="f1"><circle cx="28" cy="26" r="4"/><circle cx="44" cy="26" r="4"/><circle cx="60" cy="26" r="4"/><circle cx="76" cy="26" r="4"/><circle class="a-pop" style="--d:.3s" cx="92" cy="26" r="4"/><circle class="a-pop" style="--d:.7s" cx="108" cy="26" r="4"/><circle class="a-pop" style="--d:1.1s" cx="124" cy="26" r="4"/></g>' +
    '<rect class="o" x="20" y="48" width="120" height="12" rx="6"/><rect class="f1 a-fill" x="22" y="50" width="116" height="8" rx="4"/>' +
    '<path class="o" style="opacity:.5" d="M50 64v6M80 64v6M110 64v6"/>';

  V["entrainement-abdd"] =
    '<ellipse class="o" cx="30" cy="22" rx="16" ry="6"/><path class="o" d="M14 22v40c0 3.3 7 6 16 6s16-2.7 16-6V22M14 42c0 3.3 7 6 16 6s16-2.7 16-6"/>' +
    '<rect class="f2" x="62" y="12" width="88" height="10" rx="2"/><rect class="o" x="62" y="26" width="88" height="10" rx="2" style="opacity:.5"/><rect class="o" x="62" y="40" width="88" height="10" rx="2" style="opacity:.5"/><rect class="o" x="62" y="54" width="88" height="10" rx="2" style="opacity:.5"/>' +
    '<rect class="f1 a-rows" x="62" y="26" width="88" height="10" rx="2" style="opacity:.35"/>';

  V["streeteye"] =
    '<path class="o" d="M12 24V12h12M148 24V12h-12M12 66v12h12M148 66v12h-12"/><circle class="f1 a-blink" cx="22" cy="22" r="3"/>' +
    '<g class="a-walk"><circle class="f2" cx="80" cy="34" r="8"/><path class="f2" d="M64 74c0-14 7-24 16-24s16 10 16 24z"/><rect class="o" x="58" y="22" width="44" height="56" rx="3" stroke-dasharray="4 3"/><rect class="f1" x="58" y="14" width="20" height="8" rx="2"/></g>';

  V["chatapp"] =
    '<rect class="o" x="40" y="8" width="80" height="17" rx="4"/><rect class="f2" x="40" y="36" width="80" height="17" rx="4"/><rect class="o" x="40" y="64" width="80" height="17" rx="4"/>' +
    '<path class="o" d="M80 25v11M80 53v11"/><circle class="f1 a-down" cx="80" cy="14" r="3.5"/><circle class="f1 a-down" style="--d:1.2s" cx="80" cy="14" r="3.5"/>' +
    '<rect class="k" x="48" y="14" width="20" height="3" rx="1.5" style="opacity:.0"/>';

  V["dmob"] =
    '<rect class="o" x="56" y="5" width="48" height="80" rx="9"/><rect class="f1" x="72" y="9" width="16" height="3" rx="1.5"/>' +
    '<rect class="f2 a-slide" style="--d:0s" x="62" y="20" width="36" height="12" rx="3"/><rect class="f2 a-slide" style="--d:.35s" x="62" y="36" width="36" height="12" rx="3"/><rect class="f2 a-slide" style="--d:.7s" x="62" y="52" width="36" height="12" rx="3"/>' +
    '<circle class="f1 a-pulse" cx="92" cy="72" r="6"/>';

  V["image-scanner"] =
    '<g class="f2"><rect x="12" y="10" width="30" height="22" rx="3"/><rect x="48" y="10" width="30" height="22" rx="3"/><rect x="84" y="10" width="30" height="22" rx="3"/><rect x="120" y="10" width="28" height="22" rx="3"/>' +
    '<rect x="12" y="38" width="30" height="22" rx="3"/><rect x="48" y="38" width="30" height="22" rx="3"/><rect x="84" y="38" width="30" height="22" rx="3"/><rect x="120" y="38" width="28" height="22" rx="3"/></g>' +
    '<rect class="f1 a-sweepx" x="8" y="6" width="3" height="58"/>' +
    '<rect class="o" x="12" y="72" width="136" height="8" rx="4"/><rect class="f1 a-fill" x="14" y="74" width="132" height="4" rx="2"/>';

  V["neworcinvasion"] =
    '<defs><path id="inv" d="M2 0h2v1h4V0h2v2h1v2h-1v2H9V4H1v2H0V4h1V2h1zM3 7h2v1H3zM7 7h2v1H7z" transform="scale(1.2)"/></defs>' +
    '<g class="f1 a-march"><use href="#inv" x="22" y="8"/><use href="#inv" x="52" y="8"/><use href="#inv" x="82" y="8"/><use href="#inv" x="112" y="8"/>' +
    '<use href="#inv" x="22" y="26" style="opacity:.6"/><use href="#inv" x="52" y="26" style="opacity:.6"/><use href="#inv" x="82" y="26" style="opacity:.6"/><use href="#inv" x="112" y="26" style="opacity:.6"/></g>' +
    '<rect class="f1 a-bullet" x="79" y="50" width="2.5" height="8" rx="1"/><path class="f1" d="M70 82h20l-4-6h-4l-2-5-2 5h-4z"/>';

  V["nimgame"] =
    '<g class="f1">' +
    [1, 3, 5, 7].map(function (n, r) {
      var s = "", x0 = 80 - (n * 12) / 2 + 3, i;
      for (i = 0; i < n; i++) s += '<rect class="a-vanish" style="--d:' + ((r * 0.5 + i * 0.35) % 3).toFixed(2) + 's" x="' + (x0 + i * 12).toFixed(1) + '" y="' + (8 + r * 20) + '" width="4" height="16" rx="2"/>';
      return s;
    }).join("") + "</g>";

  var fallback = '<path class="o" d="M60 28L36 45l24 17M100 28l24 17-24 17M90 20L70 70"/>';

  H.preview = function (id) {
    var w = H.el("span", "pv");
    w.setAttribute("aria-hidden", "true");
    // Chaînes statiques définies ci-dessus : aucun contenu externe n'entre dans le SVG.
    w.innerHTML = '<svg viewBox="0 0 160 90" focusable="false">' + (V[id] || fallback) + "</svg>";
    return w;
  };
})();
