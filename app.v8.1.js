// Mason Jar Bean Tally - v8.1
// Same as v8 but with player cards widened by ~1.5x for better spacing.

// Import app.v8.js core logic
fetch('app.v8.js?v=8')
  .then(res => res.text())
  .then(src => {
    // Patch CSS grid for player cards: increase width (1.5x)
    src = src.replace('grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5', 'grid sm:grid-cols-1 xl:grid-cols-2 gap-4');
    // Update version label
    src = src.replace('v8</span>', 'v8.1</span>');
    // Run modified code
    eval(Babel.transform(src, { presets: ['react'] }).code);
  });
