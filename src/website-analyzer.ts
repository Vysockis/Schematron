import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { WebsiteType, DetectedElements, TechnicalDetails, AnalysisResult, ScrapedData } from './types.js';

export class WebsiteAnalyzer {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async analyzeWebsite(url: string): Promise<AnalysisResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();
    
    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Get page content
      const html = await page.content();
      const $ = cheerio.load(html);

      // Extract basic information
      const title = $('title').text().trim() || 'Untitled';
      const description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || '';

      // Collect all raw scraped data
      const scrapedData = this.collectScrapedData($, html);
      
      // Detect elements
      const detectedElements = this.detectElements($, page);
      
      // Detect technical details
      const technicalDetails = this.detectTechnicalDetails($, page);
      
      // Determine website type
      const websiteType = this.determineWebsiteType($, detectedElements, technicalDetails, url);
      
      // Generate schema recommendation
      const schemaRecommendation = this.generateSchemaRecommendation(websiteType, detectedElements, technicalDetails);

      return {
        url,
        title,
        description,
        websiteType,
        schemaRecommendation,
        detectedElements,
        technicalDetails,
        scrapedData
      };

    } finally {
      await page.close();
    }
  }

  private collectScrapedData($: cheerio.CheerioAPI, html: string): ScrapedData {
    // Collect all classes and IDs
    const allClasses: string[] = [];
    const allIds: string[] = [];
    
    $('*').each((_, el) => {
      const $el = $(el);
      const className = $el.attr('class');
      const id = $el.attr('id');
      
      if (className) {
        className.split(' ').forEach(cls => {
          if (cls.trim() && !allClasses.includes(cls.trim())) {
            allClasses.push(cls.trim());
          }
        });
      }
      
      if (id && !allIds.includes(id)) {
        allIds.push(id);
      }
    });

    // Collect all meta tags
    const metaTags: Record<string, string> = {};
    $('meta').each((_, el) => {
      const $el = $(el);
      const name = $el.attr('name') || $el.attr('property') || $el.attr('http-equiv');
      const content = $el.attr('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });

    // Collect all text content
    const allTextContent = $('body').text().replace(/\s+/g, ' ').trim();

    // Collect images
    const images = $('img').map((_, el) => {
      const $el = $(el);
      return {
        src: $el.attr('src') || '',
        alt: $el.attr('alt') || undefined,
        width: $el.attr('width') ? parseInt($el.attr('width')!) : undefined,
        height: $el.attr('height') ? parseInt($el.attr('height')!) : undefined
      };
    }).get();

    // Collect videos
    const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').map((_, el) => {
      const $el = $(el);
      return {
        src: $el.attr('src') || undefined,
        poster: $el.attr('poster') || undefined,
        type: $el.prop('tagName')?.toLowerCase() || 'unknown'
      };
    }).get();

    // Collect links
    const links = $('a[href]').map((_, el) => {
      const $el = $(el);
      return {
        href: $el.attr('href') || '',
        text: $el.text().trim(),
        target: $el.attr('target') || undefined
      };
    }).get();

    // Collect forms
    const forms = $('form').map((_, el) => {
      const $el = $(el);
      const inputs = $el.find('input, select, textarea').map((_, inputEl) => {
        const $input = $(inputEl);
        return {
          type: $input.attr('type') || $input.prop('tagName')?.toLowerCase() || 'unknown',
          name: $input.attr('name') || undefined,
          placeholder: $input.attr('placeholder') || undefined,
          required: $input.attr('required') !== undefined
        };
      }).get();

      return {
        action: $el.attr('action') || undefined,
        method: $el.attr('method') || undefined,
        inputs
      };
    }).get();

    // Collect scripts
    const scripts = $('script').map((_, el) => {
      const $el = $(el);
      return {
        src: $el.attr('src') || undefined,
        content: $el.html() || undefined,
        type: $el.attr('type') || undefined
      };
    }).get();

    // Collect stylesheets
    const stylesheets = $('link[rel="stylesheet"]').map((_, el) => {
      return $(el).attr('href') || '';
    }).get().filter(href => href);

    // Collect structured data
    const structuredData: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          structuredData.push(JSON.parse(content));
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    // Collect social media links
    const socialMediaLinks = links
      .filter(link => 
        link.href.includes('facebook.com') ||
        link.href.includes('twitter.com') ||
        link.href.includes('linkedin.com') ||
        link.href.includes('instagram.com') ||
        link.href.includes('youtube.com') ||
        link.href.includes('tiktok.com') ||
        link.href.includes('snapchat.com')
      )
      .map(link => link.href);

    // Collect payment indicators
    const paymentIndicators = allTextContent
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.includes('paypal') ||
        word.includes('stripe') ||
        word.includes('square') ||
        word.includes('visa') ||
        word.includes('mastercard') ||
        word.includes('amex') ||
        word.includes('payment') ||
        word.includes('checkout') ||
        word.includes('cart') ||
        word.includes('buy') ||
        word.includes('purchase')
      );

    // Collect e-commerce indicators
    const ecommerceIndicators = allTextContent
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.includes('product') ||
        word.includes('price') ||
        word.includes('sale') ||
        word.includes('discount') ||
        word.includes('shipping') ||
        word.includes('inventory') ||
        word.includes('stock') ||
        word.includes('add to cart') ||
        word.includes('buy now') ||
        word.includes('shop')
      );

    // Collect content indicators
    const contentIndicators = allTextContent
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.includes('article') ||
        word.includes('blog') ||
        word.includes('post') ||
        word.includes('news') ||
        word.includes('tutorial') ||
        word.includes('guide') ||
        word.includes('documentation') ||
        word.includes('help') ||
        word.includes('faq')
      );

    return {
      html,
      title: $('title').text().trim() || 'Untitled',
      description: $('meta[name="description"]').attr('content') || 
                  $('meta[property="og:description"]').attr('content') || undefined,
      metaTags,
      allClasses,
      allIds,
      allTextContent,
      images,
      videos,
      links,
      forms,
      scripts,
      stylesheets,
      structuredData,
      socialMediaLinks,
      paymentIndicators,
      ecommerceIndicators,
      contentIndicators
    };
  }

  private detectElements($: cheerio.CheerioAPI, page: Page): DetectedElements {
    return {
      hasVideo: $('video').length > 0 || $('iframe[src*="youtube"]').length > 0 || $('iframe[src*="vimeo"]').length > 0,
      hasImages: $('img').length > 0,
      hasForms: $('form').length > 0,
      hasNavigation: $('nav').length > 0 || $('.nav').length > 0 || $('.navigation').length > 0,
      hasFooter: $('footer').length > 0 || $('.footer').length > 0,
      hasSidebar: $('.sidebar').length > 0 || $('.side-bar').length > 0 || $('aside').length > 0,
      hasComments: $('.comments').length > 0 || $('.comment').length > 0 || $('[id*="comment"]').length > 0,
      hasSearch: $('input[type="search"]').length > 0 || $('.search').length > 0 || $('[id*="search"]').length > 0,
      hasShoppingCart: $('.cart').length > 0 || $('.shopping-cart').length > 0 || $('[id*="cart"]').length > 0,
      hasUserAuth: $('.login').length > 0 || $('.signin').length > 0 || $('[id*="login"]').length > 0 || $('[id*="signin"]').length > 0
    };
  }

  private detectTechnicalDetails($: cheerio.CheerioAPI, page: Page): TechnicalDetails {
    const analytics: string[] = [];
    const socialMedia: string[] = [];
    const paymentMethods: string[] = [];

    // Detect analytics
    $('script').each((_, el) => {
      const scriptContent = $(el).html() || '';
      if (scriptContent.includes('google-analytics') || scriptContent.includes('gtag')) {
        analytics.push('Google Analytics');
      }
      if (scriptContent.includes('facebook') && scriptContent.includes('pixel')) {
        analytics.push('Facebook Pixel');
      }
      if (scriptContent.includes('mixpanel')) {
        analytics.push('Mixpanel');
      }
    });

    // Detect social media
    $('a[href*="facebook.com"]').length > 0 && socialMedia.push('Facebook');
    $('a[href*="twitter.com"]').length > 0 && socialMedia.push('Twitter');
    $('a[href*="linkedin.com"]').length > 0 && socialMedia.push('LinkedIn');
    $('a[href*="instagram.com"]').length > 0 && socialMedia.push('Instagram');
    $('a[href*="youtube.com"]').length > 0 && socialMedia.push('YouTube');

    // Detect payment methods
    $('img[src*="stripe"]').length > 0 && paymentMethods.push('Stripe');
    $('img[src*="paypal"]').length > 0 && paymentMethods.push('PayPal');
    $('img[src*="square"]').length > 0 && paymentMethods.push('Square');
    $('[class*="stripe"]').length > 0 && paymentMethods.push('Stripe');
    $('[class*="paypal"]').length > 0 && paymentMethods.push('PayPal');

    // Detect framework/CMS
    let framework: string | undefined;
    let cms: string | undefined;

    // Check for React
    if ($('script[src*="react"]').length > 0 || $('[data-reactroot]').length > 0) {
      framework = 'React';
    }
    // Check for Vue
    if ($('script[src*="vue"]').length > 0 || $('[data-v-]').length > 0) {
      framework = 'Vue.js';
    }
    // Check for Angular
    if ($('script[src*="angular"]').length > 0 || $('[ng-app]').length > 0) {
      framework = 'Angular';
    }

    // Check for CMS
    if ($('meta[name="generator"]').attr('content')?.includes('WordPress')) {
      cms = 'WordPress';
    }
    if ($('meta[name="generator"]').attr('content')?.includes('Drupal')) {
      cms = 'Drupal';
    }
    if ($('meta[name="generator"]').attr('content')?.includes('Joomla')) {
      cms = 'Joomla';
    }

    return {
      framework,
      cms,
      analytics,
      socialMedia,
      paymentMethods
    };
  }

  private determineWebsiteType($: cheerio.CheerioAPI, elements: DetectedElements, technical: TechnicalDetails, url: string): WebsiteType {
    // E-commerce detection
    if (elements.hasShoppingCart || technical.paymentMethods.length > 0 || 
        $('.product').length > 0 || $('[class*="product"]').length > 0 ||
        $('.price').length > 0 || $('[class*="price"]').length > 0) {
      return 'ecommerce';
    }

    // Blog detection
    if ($('article').length > 0 || $('.post').length > 0 || $('.blog').length > 0 ||
        $('[class*="post"]').length > 0 || $('[class*="blog"]').length > 0) {
      return 'blog';
    }

    // News detection
    if ($('.news').length > 0 || $('[class*="news"]').length > 0 ||
        $('.article').length > 0 || $('[class*="article"]').length > 0 ||
        $('.headline').length > 0 || $('[class*="headline"]').length > 0) {
      return 'news';
    }

    // Portfolio detection
    if ($('.portfolio').length > 0 || $('[class*="portfolio"]').length > 0 ||
        $('.gallery').length > 0 || $('[class*="gallery"]').length > 0 ||
        $('.work').length > 0 || $('[class*="work"]').length > 0) {
      return 'portfolio';
    }

    // Social media detection
    if (elements.hasUserAuth && elements.hasComments && 
        (elements.hasVideo || elements.hasImages) && 
        technical.socialMedia.length > 0) {
      return 'social_media';
    }

    // Forum detection
    if (elements.hasComments && elements.hasUserAuth && 
        $('.thread').length > 0 || $('[class*="thread"]').length > 0 ||
        $('.topic').length > 0 || $('[class*="topic"]').length > 0) {
      return 'forum';
    }

    // Documentation detection
    if ($('.documentation').length > 0 || $('[class*="docs"]').length > 0 ||
        $('.tutorial').length > 0 || $('[class*="tutorial"]').length > 0 ||
        $('.guide').length > 0 || $('[class*="guide"]').length > 0) {
      return 'documentation';
    }

    // SaaS detection
    if (elements.hasUserAuth && elements.hasForms && 
        ($('.dashboard').length > 0 || $('[class*="dashboard"]').length > 0 ||
         $('.app').length > 0 || $('[class*="app"]').length > 0)) {
      return 'saas';
    }

    // Educational detection
    if ($('.course').length > 0 || $('[class*="course"]').length > 0 ||
        $('.lesson').length > 0 || $('[class*="lesson"]').length > 0 ||
        $('.education').length > 0 || $('[class*="education"]').length > 0) {
      return 'educational';
    }

    // Entertainment detection
    if (elements.hasVideo && ($('.entertainment').length > 0 || 
        $('[class*="entertainment"]').length > 0 || 
        $('.media').length > 0 || $('[class*="media"]').length > 0)) {
      return 'entertainment';
    }

    // Government detection
    if ($('.gov').length > 0 || $('[class*="gov"]').length > 0 ||
        url.includes('.gov') || $('.government').length > 0) {
      return 'government';
    }

    // Nonprofit detection
    if ($('.nonprofit').length > 0 || $('[class*="nonprofit"]').length > 0 ||
        $('.charity').length > 0 || $('[class*="charity"]').length > 0 ||
        $('.donate').length > 0 || $('[class*="donate"]').length > 0) {
      return 'nonprofit';
    }

    // Landing page detection
    if ($('.landing').length > 0 || $('[class*="landing"]').length > 0 ||
        $('.hero').length > 0 || $('[class*="hero"]').length > 0) {
      return 'landing_page';
    }

    // Corporate detection (default for business sites)
    if (elements.hasNavigation && elements.hasFooter && 
        ($('.about').length > 0 || $('[class*="about"]').length > 0 ||
         $('.contact').length > 0 || $('[class*="contact"]').length > 0)) {
      return 'corporate';
    }

    return 'unknown';
  }

  private generateSchemaRecommendation(
    websiteType: WebsiteType, 
    elements: DetectedElements, 
    technical: TechnicalDetails
  ): any {
    // Provide AI with Schema.org reference and let it make intelligent decisions
    return {
      schemaType: 'AI_DECISION_REQUIRED',
      confidence: 0.0,
      reasoning: 'AI should analyze the complete scraped data to determine appropriate Schema.org schemas',
      requiredFields: [],
      optionalFields: [],
      documentation: `Based on the complete scraped data, analyze and recommend appropriate Schema.org schemas from https://schema.org/

## Schema.org Reference
Schema.org provides a shared vocabulary for structured data on the web. As of 2024, over 45 million web domains use Schema.org markup with over 450 billion objects.

## Available Schema Types (from Schema.org)
- **Thing** (base type)
- **CreativeWork** (Article, Blog, Book, Movie, MusicRecording, etc.)
- **Organization** (Corporation, EducationalOrganization, GovernmentOrganization, etc.)
- **Person**
- **Place** (LocalBusiness, TouristAttraction, etc.)
- **Event**
- **Product** (with Offer, AggregateRating, Review)
- **Service**
- **WebPage** (AboutPage, ContactPage, FAQPage, etc.)
- **WebSite**
- **And many more...**

## AI Analysis Instructions
1. **Examine the scraped data** to understand the website's purpose and content
2. **Identify primary content types** (products, articles, events, services, etc.)
3. **Choose appropriate Schema.org types** from the official vocabulary
4. **Map existing content** to schema properties
5. **Consider multiple schemas** for complex websites
6. **Reference Schema.org documentation** for accurate property names and requirements

## Implementation Notes
- Use JSON-LD format (recommended by Google)
- Validate with Google's Rich Results Test
- Follow Schema.org property requirements
- Consider inheritance (e.g., Article extends CreativeWork)
- Use @type to specify schema types
- Include @context: "https://schema.org" in JSON-LD`
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
