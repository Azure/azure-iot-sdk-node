module.exports = {
  singleQuote: true,
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended'
      ],
      singleQuote: true
    },
  ],
};