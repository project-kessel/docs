// Configuration overlay for extending Astro and Starlight configs
// 
// This file provides two targeted overlay functions:
// 1. applyTopLevelOverlay - modifies top-level Astro configuration (site, base, integrations, etc.)
// 2. applyStarlightOverlay - modifies Starlight configuration (sidebar, title, plugins, etc.)
//

// **WARNING** MODIFICATIONS TO THIS FILE MAY BREAK INTERNAL MIRRORING.
// It is allowed to modify this file, but be sure to quickly follow up
// by manually resolving conflicts in the fork.

/**
 * Apply overlays to top-level Astro configuration
 * @param {Object} config - The base Astro configuration object
 * @returns {Object} - The modified configuration
 */
export function applyTopLevelOverlay(config) {
  return config;
}

/**
 * Apply overlays to Starlight configuration
 * @param {Object} starlightConfig - The base Starlight configuration object
 * @returns {Object} - The modified configuration
 */
export function applyStarlightOverlay(starlightConfig) {
  starlightConfig.sidebar.push({
    label: "For Red Hatters",
    link: "./for-red-hatters/",
    attrs: {
      class: "red-hat",
    },
  })

  return starlightConfig;
}
