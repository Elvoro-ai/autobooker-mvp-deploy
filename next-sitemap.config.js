/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://autobooker-mvp-deploy.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/test']
      }
    ],
    additionalSitemaps: [
      'https://autobooker-mvp-deploy.vercel.app/sitemap-0.xml'
    ]
  },
  
  exclude: [
    '/api/*',
    '/admin/*',
    '/test',
    '/_next/*',
    '/404',
    '/500'
  ],
  
  transform: async (config, path) => {
    // Personnaliser la priorité des pages
    const customPriorities = {
      '/': 1.0,
      '/pricing': 0.9,
      '/features': 0.8,
      '/contact': 0.7
    };
    
    return {
      loc: path,
      changefreq: path === '/' ? 'daily' : 'weekly',
      priority: customPriorities[path] || 0.6,
      lastmod: new Date().toISOString()
    };
  }
};