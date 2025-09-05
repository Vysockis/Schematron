import { z } from 'zod';

export const WebsiteTypeSchema = z.enum([
  'ecommerce',
  'blog',
  'news',
  'portfolio',
  'corporate',
  'social_media',
  'forum',
  'documentation',
  'landing_page',
  'saas',
  'educational',
  'entertainment',
  'government',
  'nonprofit',
  'unknown'
]);

export const SchemaSelectionSchema = z.object({
  mainSchema: z.string(),
  nestedSchemas: z.array(z.object({
    type: z.string(),
    context: z.string(),
    properties: z.record(z.any())
  })),
  reasoning: z.string(),
  implementation: z.string()
});

export const SchemaRecommendationSchema = z.object({
  schemaType: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  requiredFields: z.array(z.string()),
  optionalFields: z.array(z.string()),
  documentation: z.string(),
  schemaSelection: SchemaSelectionSchema.optional()
});

export const ScrapedDataSchema = z.object({
  html: z.string(),
  title: z.string(),
  description: z.string().optional(),
  metaTags: z.record(z.string()),
  allClasses: z.array(z.string()),
  allIds: z.array(z.string()),
  allTextContent: z.string(),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })),
  videos: z.array(z.object({
    src: z.string().optional(),
    poster: z.string().optional(),
    type: z.string().optional()
  })),
  links: z.array(z.object({
    href: z.string(),
    text: z.string(),
    target: z.string().optional()
  })),
  forms: z.array(z.object({
    action: z.string().optional(),
    method: z.string().optional(),
    inputs: z.array(z.object({
      type: z.string(),
      name: z.string().optional(),
      placeholder: z.string().optional(),
      required: z.boolean().optional()
    }))
  })),
  scripts: z.array(z.object({
    src: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional()
  })),
  stylesheets: z.array(z.string()),
  structuredData: z.array(z.any()),
  socialMediaLinks: z.array(z.string()),
  paymentIndicators: z.array(z.string()),
  ecommerceIndicators: z.array(z.string()),
  contentIndicators: z.array(z.string())
});

export const AnalysisResultSchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  websiteType: WebsiteTypeSchema,
  schemaRecommendation: SchemaRecommendationSchema,
  detectedElements: z.object({
    hasVideo: z.boolean(),
    hasImages: z.boolean(),
    hasForms: z.boolean(),
    hasNavigation: z.boolean(),
    hasFooter: z.boolean(),
    hasSidebar: z.boolean(),
    hasComments: z.boolean(),
    hasSearch: z.boolean(),
    hasShoppingCart: z.boolean(),
    hasUserAuth: z.boolean()
  }),
  technicalDetails: z.object({
    framework: z.string().optional(),
    cms: z.string().optional(),
    analytics: z.array(z.string()),
    socialMedia: z.array(z.string()),
    paymentMethods: z.array(z.string())
  }),
  scrapedData: ScrapedDataSchema
});

export type WebsiteType = z.infer<typeof WebsiteTypeSchema>;
export type SchemaSelection = z.infer<typeof SchemaSelectionSchema>;
export type SchemaRecommendation = z.infer<typeof SchemaRecommendationSchema>;
export type ScrapedData = z.infer<typeof ScrapedDataSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type DetectedElements = AnalysisResult['detectedElements'];
export type TechnicalDetails = AnalysisResult['technicalDetails'];
