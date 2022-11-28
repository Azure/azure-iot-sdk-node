module.exports = {
  "env": {
    "commonjs": true,
    "node": true,
    "mocha": true,
    "es6": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:security/recommended",
    "plugin:mocha/recommended"
  ],
  "plugins": [
    "@typescript-eslint",
    "mocha",
    "jsdoc"
  ],
  "parserOptions": {
    "ecmaVersion": 8
  },
  "overrides": [
    {
      "files": ["*.ts"],
      "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
      },
      "extends": [
        "plugin:@typescript-eslint/recommended",
        // "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/member-ordering": ["error", { "default": ["abstract-method", "instance-method", "static-method"] }],
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "@typescript-eslint/dot-notation": "error",
        "@typescript-eslint/member-delimiter-style": [
          "error",
          {
            "multiline": {
              "delimiter": "semi",
              "requireLast": true
            },
            "singleline": {
              "delimiter": "semi",
              "requireLast": false
            }
          }
        ],
        "@typescript-eslint/typedef": [
          "error",
          {
            "callSignature": true,
            "parameter": true,
            "propertyDeclaration": true,
            "memberVariableDeclaration": true,
            "arrowParameter": false
          }
        ],
        "@typescript-eslint/no-empty-function": "error",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/semi": [
          "error",
          "always"
        ],
        "@typescript-eslint/type-annotation-spacing": "error",
        // "@typescript-eslint/no-dupe-class-members": "off",
      }
    },
  ],
  "rules": {
    "security/detect-object-injection": "off",
    "mocha/no-setup-in-describe": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "arrow-parens": [
      "error",
      "always"
    ],
    "brace-style": [
      "error",
      "1tbs",
      { "allowSingleLine": true }
    ],
    "comma-dangle": "off",
    "eol-last": "error",
    "eqeqeq": [
      "error",
      "smart"
    ],
    "id-denylist": [
      "error",
      "any",
      "Number",
      "number",
      "String",
      "string",
      "Boolean",
      "boolean",
      "Undefined",
      "undefined"
    ],
    "id-match": "error",
    "jsdoc/check-alignment": "error",
    "jsdoc/newline-after-description": "error",
    "linebreak-style": "off",
    "max-len": "off",
    "new-parens": "error",
    "no-empty": "error",
    "no-fallthrough": "error",
    "no-invalid-this": "error",
    "no-new-wrappers": "error",
    "no-null/no-null": "off",
    "no-redeclare": "error",
    "no-trailing-spaces": "error",
    "no-unsafe-finally": "error",
    "no-var": "error",
    "object-curly-spacing": [
      "error",
      "always"
    ],
    "one-var": [
      "error",
      "never"
    ],
    "require-jsdoc": "off",
    "space-before-function-paren": [
      "error",
      {
        "anonymous": "always",
        "named": "never"
      }
    ],
    // "spaced-comment": [
    //   "error",
    //   "always",
    //   {
    //     "markers": [
    //       "/"
    //     ],
    //     "block": {
    //       "balanced": true
    //     }
    //   }
    // ],
    "use-isnan": "error"
  }
}
