// Lint only what catches broken imports after a split: undefined names and unused imports.
import globals from "globals";

export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // WordPress loads these before the editor (see includes/editor/class-editor.php).
      globals: { ...globals.browser, wp: "readonly", jQuery: "readonly", tinymce: "readonly", wpLink: "readonly", QTags: "readonly" },
    },
    rules: {
      "no-undef": "error",
    },
  },
];
