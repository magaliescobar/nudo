/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard-scss"],
  // Todo `stylelint-disable` debe explicar por qué (R07: `!important` solo con justificación).
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  rules: {
    // R07: Sass moderno con @use/@forward; @import está prohibido.
    "at-rule-disallowed-list": ["import"],
    // Los colores salen de tokens; nada de literales en componentes.
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"],
    "declaration-no-important": true,
    "max-nesting-depth": [3, { ignore: ["pseudo-classes"] }],
    // Clases de CSS Modules en camelCase para usarlas como styles.foo.
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*$",
      { message: "Usá camelCase en las clases de CSS Modules (styles.miClase)." },
    ],
  },
  overrides: [
    {
      // Única fuente de valores literales: el paquete de tokens.
      files: ["packages/tokens/**/*.scss"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
  ignoreFiles: ["**/node_modules/**", "**/.next/**", "docs/**"],
};

export default config;
