module.exports = {
  ci: {
    collect: {
      url: [
        'https://autobooker-mvp-deploy.vercel.app',
        'https://autobooker-mvp-deploy.vercel.app/#demo'
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.85}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.90}],
        'categories:seo': ['error', {minScore: 0.95}],
        'categories:pwa': ['warn', {minScore: 0.80}]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};