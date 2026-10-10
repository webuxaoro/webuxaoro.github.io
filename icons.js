(() => {
  const ST = 'fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"';
  const FL = 'fill="currentColor"';
  const box = (cls, attrs, inner) =>
    `<svg class="ico-svg ${cls || ""}" viewBox="0 0 256 256" aria-hidden="true" ${attrs}>${inner}</svg>`;

  const PATHS = {
    heart: "M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z",
    cog: "M41.43,178.09A99.14,99.14,0,0,1,31.36,153.8l16.78-21a81.59,81.59,0,0,1,0-9.64l-16.77-21a99.43,99.43,0,0,1,10.05-24.3l26.71-3a81,81,0,0,1,6.81-6.81l3-26.7A99.14,99.14,0,0,1,102.2,31.36l21,16.78a81.59,81.59,0,0,1,9.64,0l21-16.77a99.43,99.43,0,0,1,24.3,10.05l3,26.71a81,81,0,0,1,6.81,6.81l26.7,3a99.14,99.14,0,0,1,10.07,24.29l-16.78,21a81.59,81.59,0,0,1,0,9.64l16.77,21a99.43,99.43,0,0,1-10,24.3l-26.71,3a81,81,0,0,1-6.81,6.81l-3,26.7a99.14,99.14,0,0,1-24.29,10.07l-21-16.78a81.59,81.59,0,0,1-9.64,0l-21,16.77a99.43,99.43,0,0,1-24.3-10l-3-26.71a81,81,0,0,1-6.81-6.81Z",
    star: "M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z",
    bell: "M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z",
    phone: "M164.39,145.34a8,8,0,0,1,7.59-.69l47.16,21.13a8,8,0,0,1,4.8,8.3A48.33,48.33,0,0,1,176,216,136,136,0,0,1,40,80,48.33,48.33,0,0,1,81.92,32.06a8,8,0,0,1,8.3,4.8l21.13,47.2a8,8,0,0,1-.66,7.53L89.32,117a7.93,7.93,0,0,0-.54,7.81c8.27,16.93,25.77,34.22,42.75,42.41a7.92,7.92,0,0,0,7.83-.59Z",
    bookmark: "M192,224l-64-40L64,224V48a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8Z",
    arrowLeft: "M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z",
    trash: "M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z",
    plus: "M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z",
    video: "M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM192,184H32V72H192ZM240,161.05l-32-21.33V116.28L240,95Z",
  };

  const DRAW = {
    heart: () => box("ico-fill", FL, `<g class="ico-beat"><path d="${PATHS.heart}"/></g>`),
    list: () => box("ico-stroke", ST, `<line class="ico-row ico-r0" x1="40" y1="64" x2="216" y2="64"/><line class="ico-row ico-r1" x1="40" y1="128" x2="216" y2="128"/><line class="ico-row ico-r2" x1="40" y1="192" x2="216" y2="192"/>`),
    user: () => box("ico-stroke", ST, `<circle class="ico-head" cx="128" cy="96" r="64"/><path d="M32,216c19.37-33.47,54.55-56,96-56s76.63,22.53,96,56"/>`),
    gear: () => box("ico-stroke", ST, `<g class="ico-spin"><circle cx="128" cy="128" r="40"/><path d="${PATHS.cog}"/></g>`),
    house: () => box("ico-stroke", ST, `<path class="ico-roof" d="M216,120a8,8,0,0,0-2.34-5.66l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,40,120"/><path d="M104,216h-64V120M152,216h64V120"/><path class="ico-door" d="M104,216V152h48v64"/>`),
    search: () => box("ico-stroke", ST, `<g class="ico-hunt"><circle cx="112" cy="112" r="80"/><path d="M168.57,168.57L224,224"/></g>`),
    bell: () => box("ico-fill", FL, `<g class="ico-ring"><path d="${PATHS.bell}"/></g>`),
    people: () => box("ico-stroke", ST, `<path class="ico-wave-l" d="M64,120A32,32,0,1,1,95,80"/><path d="M16,144a59.91,59.91,0,0,1,48-24"/><circle class="ico-wave-c" cx="128" cy="144" r="40"/><path d="M72,216a65,65,0,0,1,112,0"/><path class="ico-wave-r" d="M161,80a32,32,0,1,1,31,40"/><path d="M192,120a59.91,59.91,0,0,1,48,24"/>`),
    bookmark: () => box("ico-stroke", ST, `<path class="ico-swing" d="${PATHS.bookmark}"/>`),
    phone: () => box("ico-stroke", ST, `<path class="ico-jiggle" d="${PATHS.phone}"/>`),
    envelope: () => box("ico-stroke", ST, `<path d="M32,56H224V192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56Z"/><path class="ico-flap" d="M224,56L128,144L32,56"/>`),
    star: () => box("ico-fill", FL, `<g class="ico-twinkle"><path d="${PATHS.star}"/></g>`),
    trash: () => box("ico-fill", FL, `<g class="ico-lid"><path d="${PATHS.trash}"/></g>`),
    back: () => box("ico-fill", FL, `<path class="ico-slide" d="${PATHS.arrowLeft}"/>`),
    plus: () => box("ico-fill", FL, `<path class="ico-pop" d="${PATHS.plus}"/>`),
    share: () => box("ico-stroke", ST, `<path d="M32,128v72a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8v-72"/><polyline class="ico-slide" points="88,80 128,40 168,80"/><line x1="128" y1="40" x2="128" y2="152"/>`),
    video: () => box("ico-fill", FL, `<path class="ico-pop" d="${PATHS.video}"/>`),
    news: () => box("ico-stroke", ST, `<rect x="32" y="48" width="192" height="160" rx="16"/><line class="ico-row ico-r0" x1="64" y1="96" x2="192" y2="96"/><line class="ico-row ico-r1" x1="64" y1="136" x2="192" y2="136"/><line class="ico-row ico-r2" x1="64" y1="176" x2="144" y2="176"/>`),
  };

  // Shown instead of silently drawing a star when a caller asks for an icon
  // that does not exist: a typo used to look like a deliberate choice.
  function missing(cls) {
    return `<span class="ico ico-missing${cls ? " " + cls : ""}" aria-hidden="true">`
      + box("ico-stroke", ST, `<rect x="40" y="40" width="176" height="176" rx="28" stroke-dasharray="28 18"/><line x1="128" y1="96" x2="128" y2="144"/><line x1="128" y1="172" x2="128" y2="173"/>`)
      + `</span>`;
  }

  function html(name, cls) {
    const draw = DRAW[name];
    if (!draw) {
      if (window.console && console.warn) console.warn("[uxaoro] unknown icon: " + name);
      return missing(cls);
    }
    return `<span class="ico ico-${name}${cls ? " " + cls : ""}">${draw()}</span>`;
  }

  function asset(name, cls) {
    const safe = String(name || "").replace(/[^a-z0-9-]/gi, "");
    if (!safe) return "";
    return `<span class="ico ico-asset${cls ? " " + cls : ""}" aria-hidden="true" style="--ico-asset:url('./icons/${safe}-svgrepo-com.svg')"></span>`;
  }

  window.Ico = { html, asset, missing, names: Object.keys(DRAW) };
})();
