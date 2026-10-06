export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'test', 'refactor', 'chore', 'ci']],
    'header-max-length': [2, 'always', 120],
    'subject-case': [0],
  },
};
