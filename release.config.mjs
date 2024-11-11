/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["master"],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    '@semantic-release/npm', // Updates package.json version
    [
  		"@semantic-release/git",
  		{
  			"assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
  			"message": "release: Release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
  		}
  	],
    '@semantic-release/github', // Creates GitHub release
  ],
};
