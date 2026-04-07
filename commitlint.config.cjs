module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'issue-reference-required': (parsed) => {
          const message = [parsed.header, parsed.body, parsed.footer]
            .filter(Boolean)
            .join('\n');
          const hasIssueReference = /(?:^|\s)(?:#\d+|refs\s+#\d+|fixes\s+#\d+)(?=$|\s)/i.test(message);

          return [
            hasIssueReference,
            'commit message must include an issue reference like #14, refs #14, or fixes #14',
          ];
        },
      },
    },
  ],
  rules: {
    'issue-reference-required': [2, 'always'],
  },
};