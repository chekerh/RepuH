// Turbopack has no built-in `?raw` loader for `.html`, and the registered
// OrbGallery source is a canonical .html module. This loader exports the
// file's text as the module value — the same contract `?raw` gives the
// authored component.
module.exports = function orbHtmlRawLoader(source) {
  return `module.exports = ${JSON.stringify(source)};`;
};
