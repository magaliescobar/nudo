// Valor permitido para propiedades con escala: tokens, 0/auto, calc() o variables locales.
// La API Sass se usa como `@use "tokens" as *`, así que las llamadas llegan sin prefijo
// (`token("space-md")`); también se acepta el nombre calificado `tokens.token(...)`.
const tokenCall = String.raw`(?:tokens\.)?(?:token|breakpoint|motion)\([^()]*\)`;
const scaled = new RegExp(
  `^(?:(?:0|auto|inherit|initial|-?${tokenCall}|calc\\(.+\\)|var\\(--[a-z0-9-]+\\))\\s*)+$`,
);
const tokenOnly = new RegExp(`^(?:${tokenCall}|inherit$)`);

/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard-scss"],
  // Todo `stylelint-disable` debe explicar por qué (R07: `!important` solo con justificación).
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  rules: {
    // R07: Sass moderno con @use/@forward; @import está prohibido.
    "at-rule-disallowed-list": ["import"],
    // R07: sin valores mágicos. Colores, tamaños, sombras, duraciones y capas salen de tokens.
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"],
    "declaration-property-value-allowed-list": {
      "/^(margin|padding|gap|row-gap|column-gap|inset)(-.+)?$/": [scaled],
      "/^(top|right|bottom|left)$/": [scaled],
      "font-size": [tokenOnly, /^(1em|100%)$/],
      "font-weight": [tokenOnly, /^normal$/],
      "line-height": [tokenOnly, /^(1|normal)$/],
      "letter-spacing": [tokenOnly, /^normal$/],
      "box-shadow": [tokenOnly, /^none$/],
      "z-index": [tokenOnly, /^(auto|0|1|-1)$/],
      "/^(transition|animation)-duration$/": [tokenOnly],
      "border-radius": [tokenOnly, /^(0|50%)$/],
    },
    "declaration-no-important": true,
    "max-nesting-depth": [3, { ignore: ["pseudo-classes"] }],
    // Clases de CSS Modules: camelCase o estados BEM `is-*`/`has-*` (se consumen
    // con notación de corchete `styles["is-sm"]`, que CSS Modules soporta).
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$",
      {
        message:
          'Clases de CSS Modules en camelCase o kebab-case (styles.miClase / styles["is-sm"]).',
      },
    ],
  },
  overrides: [
    {
      // La API Sass interpola nombres y valores recibidos por parámetro.
      files: ["packages/tokens/**/*.scss"],
      rules: {
        "container-name-pattern": null,
      },
    },
  ],
  ignoreFiles: [
    "**/node_modules/**",
    "**/.next/**",
    "docs/**",
    "packages/tokens/scss/_generated.scss",
  ],
};

export default config;
