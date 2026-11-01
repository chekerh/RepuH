import next from "eslint-config-next";

/**
 * Next's flat config already ignores build output. The extension is plain
 * browser JavaScript with its own globals, and contracts/ is Solidity, so both
 * are outside the application lint surface.
 *
 * @type {import("eslint").Linter.Config[]}
 */
const config = [
  ...next,
  {
    ignores: [
      "apps/extension/src/**",
      "apps/extension/dist/**",
      "contracts/**",
      "data/**",
      // Static assets served verbatim — the vendored three.js runtime for the
      // orb document is minified third-party code, not application source.
      "public/**",
    ],
  },
];

export default config;
