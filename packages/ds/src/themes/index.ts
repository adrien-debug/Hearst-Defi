/**
 * @ds/core · themes barrel
 *
 * Theme CSS files are side-effect imports — they register `[data-ds-theme="x"]`
 * + `.ds-theme-x` selectors via `@layer ds.themes`. Consumers import them once
 * at the app entry (e.g. `import "@ds/core/themes/light.css"`).
 */

export * from "./theme-engine";
export * from "./white-label";
