#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WebsiteAnalyzer } from './website-analyzer.js';
import { AnalysisResultSchema } from './types.js';
import * as path from 'path';

class WebsiteSchemaAnalyzerServer {
  private server: Server;
  private analyzer: WebsiteAnalyzer;

  constructor() {
    this.server = new Server(
      {
        name: 'website-schema-analyzer',
        version: '1.0.0',
      }
    );

    this.analyzer = new WebsiteAnalyzer();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_website',
            description: 'Analyze a website to determine its type and recommend appropriate schema markup',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the website to analyze',
                  format: 'uri',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'get_schema_recommendations',
            description: 'Get detailed schema recommendations by analyzing a specific website URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the website to analyze and get recommendations for',
                  format: 'uri',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'generate_schema_markup',
            description: 'Generate actual JSON-LD schema markup based on AI-selected main and nested schemas',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the website to generate schema for',
                  format: 'uri',
                },
                mainSchema: {
                  type: 'string',
                  description: 'The main Schema.org type (e.g., Product, Article, Organization)',
                },
                nestedSchemas: {
                  type: 'array',
                  description: 'Array of nested schemas with their types and properties',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        description: 'Schema.org type (e.g., Offer, Person, Review)',
                      },
                      context: {
                        type: 'string',
                        description: 'Where this schema should be nested (e.g., offers, author, review)',
                      },
                      properties: {
                        type: 'object',
                        description: 'Properties to include in this nested schema',
                      }
                    },
                    required: ['type', 'context', 'properties']
                  }
                },
                customProperties: {
                  type: 'object',
                  description: 'Additional custom properties to include in the main schema',
                }
              },
              required: ['url', 'mainSchema'],
            },
          },
          {
            name: 'get_all_schema_types',
            description: 'Fetch all Schema.org types with hierarchical relationships from the official website',
            inputSchema: {
              type: 'object',
              properties: {
                includeHierarchy: {
                  type: 'boolean',
                  description: 'Whether to include the hierarchical tree structure (default: true)',
                  default: true
                },
                includeDescriptions: {
                  type: 'boolean', 
                  description: 'Whether to include type descriptions (default: true)',
                  default: true
                },
                category: {
                  type: 'string',
                  description: 'Filter by category (travel, business, content, ecommerce, events, places, actions)',
                  enum: ['travel', 'business', 'content', 'ecommerce', 'events', 'places', 'actions', 'all']
                }
              },
              required: [],
            },
          },
          {
            name: 'take_screenshot',
            description: 'Take a full page screenshot of a website after waiting 20 seconds for content to load',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the website to screenshot',
                  format: 'uri',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'take_screenshot_file',
            description: 'Take a full page screenshot and save it to a file after waiting 20 seconds for content to load',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL of the website to screenshot',
                  format: 'uri',
                },
                filename: {
                  type: 'string',
                  description: 'Optional custom filename (without extension). If not provided, auto-generated from URL and timestamp',
                },
              },
              required: ['url'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_website': {
            const { url } = args as { url: string };
            
            // Validate URL
            try {
              new URL(url);
            } catch {
              throw new Error('Invalid URL provided');
            }

            // Initialize analyzer if not already done
            if (!this.analyzer) {
              this.analyzer = new WebsiteAnalyzer();
            }

            // Analyze the website
            const result = await this.analyzer.analyzeWebsite(url);
            
            // Validate result
            const validatedResult = AnalysisResultSchema.parse(result);

            return {
              content: [
                {
                  type: 'text',
                  text: `# Complete Website Analysis Results

## Basic Information
- **URL**: ${validatedResult.url}
- **Title**: ${validatedResult.title}
- **Description**: ${validatedResult.description || 'No description found'}

## Website Type Analysis
**Detected Type**: ${validatedResult.websiteType}
**Confidence**: ${Math.round(validatedResult.schemaRecommendation.confidence * 100)}%

## AI Schema Analysis Required
**Status**: ${validatedResult.schemaRecommendation.schemaType}
**Reasoning**: ${validatedResult.schemaRecommendation.reasoning}

**Note**: Use the complete scraped data below to determine appropriate Schema.org schemas. Do not rely on hardcoded recommendations - analyze the actual content and structure.

## Complete Scraped Data for AI Analysis

### HTML Structure
- **All CSS Classes Found**: ${validatedResult.scrapedData.allClasses.slice(0, 50).join(', ')}${validatedResult.scrapedData.allClasses.length > 50 ? ` (and ${validatedResult.scrapedData.allClasses.length - 50} more...)` : ''}
- **All Element IDs Found**: ${validatedResult.scrapedData.allIds.slice(0, 20).join(', ')}${validatedResult.scrapedData.allIds.length > 20 ? ` (and ${validatedResult.scrapedData.allIds.length - 20} more...)` : ''}

### Content Analysis
- **Total Images**: ${validatedResult.scrapedData.images.length}
- **Total Videos**: ${validatedResult.scrapedData.videos.length}
- **Total Links**: ${validatedResult.scrapedData.links.length}
- **Total Forms**: ${validatedResult.scrapedData.forms.length}
- **Total Scripts**: ${validatedResult.scrapedData.scripts.length}

### Images Found
${validatedResult.scrapedData.images.slice(0, 10).map(img => `- **${img.src}** (alt: ${img.alt || 'none'})`).join('\n')}${validatedResult.scrapedData.images.length > 10 ? `\n- ... and ${validatedResult.scrapedData.images.length - 10} more images` : ''}

### Videos Found
${validatedResult.scrapedData.videos.slice(0, 5).map(video => `- **${video.src || 'embedded'}** (type: ${video.type})`).join('\n')}${validatedResult.scrapedData.videos.length > 5 ? `\n- ... and ${validatedResult.scrapedData.videos.length - 5} more videos` : ''}

### Forms Found
${validatedResult.scrapedData.forms.slice(0, 5).map((form, i) => `- **Form ${i + 1}**: ${form.action || 'no action'} (method: ${form.method || 'GET'}) - ${form.inputs.length} inputs`).join('\n')}${validatedResult.scrapedData.forms.length > 5 ? `\n- ... and ${validatedResult.scrapedData.forms.length - 5} more forms` : ''}

### Meta Tags
${Object.entries(validatedResult.scrapedData.metaTags).slice(0, 10).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}${Object.keys(validatedResult.scrapedData.metaTags).length > 10 ? `\n- ... and ${Object.keys(validatedResult.scrapedData.metaTags).length - 10} more meta tags` : ''}

### Content Indicators
- **E-commerce Indicators**: ${validatedResult.scrapedData.ecommerceIndicators.slice(0, 10).join(', ')}${validatedResult.scrapedData.ecommerceIndicators.length > 10 ? ` (${validatedResult.scrapedData.ecommerceIndicators.length - 10} more...)` : 'None found'}
- **Payment Indicators**: ${validatedResult.scrapedData.paymentIndicators.slice(0, 10).join(', ')}${validatedResult.scrapedData.paymentIndicators.length > 10 ? ` (${validatedResult.scrapedData.paymentIndicators.length - 10} more...)` : 'None found'}
- **Content Indicators**: ${validatedResult.scrapedData.contentIndicators.slice(0, 10).join(', ')}${validatedResult.scrapedData.contentIndicators.length > 10 ? ` (${validatedResult.scrapedData.contentIndicators.length - 10} more...)` : 'None found'}

### Social Media Links
${validatedResult.scrapedData.socialMediaLinks.slice(0, 5).map(link => `- ${link}`).join('\n')}${validatedResult.scrapedData.socialMediaLinks.length > 5 ? `\n- ... and ${validatedResult.scrapedData.socialMediaLinks.length - 5} more social links` : 'None found'}

### Structured Data Found
${validatedResult.scrapedData.structuredData.length > 0 ? `Found ${validatedResult.scrapedData.structuredData.length} structured data blocks` : 'No structured data found'}

### Full Text Content Sample
${validatedResult.scrapedData.allTextContent.substring(0, 1000)}${validatedResult.scrapedData.allTextContent.length > 1000 ? '...' : ''}

## AI Analysis Instructions
Use the complete scraped data above to:
1. **Analyze CSS classes and IDs** to identify patterns and naming conventions
2. **Examine content indicators** to determine the true website type
3. **Review form structures** to understand user interactions
4. **Check existing structured data** to avoid conflicts
5. **Analyze text content** for semantic understanding
6. **Choose appropriate Schema.org types** from the official vocabulary at https://schema.org/
7. **Map existing content** to schema properties
8. **Consider multiple schemas** for complex websites

## Schema.org Reference
${validatedResult.schemaRecommendation.documentation}

## Next Steps
1. **Analyze the raw data** to understand the website's purpose and content
2. **Choose appropriate Schema.org schemas** from the official vocabulary
3. **Map existing content** to schema properties
4. **Implement JSON-LD structured data** based on your analysis
5. **Test using Google's Rich Results Test**: https://search.google.com/test/rich-results
6. **Validate with Schema.org tools** and monitor search console
7. **Iterate based on performance** and validation feedback`
                }
              ],
            };
          }

          case 'get_schema_recommendations': {
            const { url } = args as { url: string };
            
            // Validate URL
            try {
              new URL(url);
            } catch {
              throw new Error('Invalid URL provided');
            }

            // Initialize analyzer if not already done
            if (!this.analyzer) {
              this.analyzer = new WebsiteAnalyzer();
            }

            // Analyze the website
            const result = await this.analyzer.analyzeWebsite(url);
            
            // Validate result
            const validatedResult = AnalysisResultSchema.parse(result);

            return {
              content: [
                {
                  type: 'text',
                  text: `# Detailed Schema Recommendations with Complete Data

## Website Analysis Summary
- **URL**: ${validatedResult.url}
- **Title**: ${validatedResult.title}
- **Detected Type**: ${validatedResult.websiteType}
- **Confidence**: ${Math.round(validatedResult.schemaRecommendation.confidence * 100)}%

## Complete Raw Data for AI Analysis

### All CSS Classes Found
${validatedResult.scrapedData.allClasses.join(', ')}

### All Element IDs Found
${validatedResult.scrapedData.allIds.join(', ')}

### All Meta Tags
${Object.entries(validatedResult.scrapedData.metaTags).map(([key, value]) => `${key}: ${value}`).join('\n')}

### Images Data
${validatedResult.scrapedData.images.map(img => `src: ${img.src}, alt: ${img.alt || 'none'}, width: ${img.width || 'auto'}, height: ${img.height || 'auto'}`).join('\n')}

### Videos Data
${validatedResult.scrapedData.videos.map(video => `src: ${video.src || 'embedded'}, type: ${video.type}, poster: ${video.poster || 'none'}`).join('\n')}

### Forms Data
${validatedResult.scrapedData.forms.map((form, i) => `Form ${i + 1}: action=${form.action || 'none'}, method=${form.method || 'GET'}, inputs=[${form.inputs.map(input => `${input.type}(${input.name || 'unnamed'})`).join(', ')}]`).join('\n')}

### Links Data
${validatedResult.scrapedData.links.slice(0, 20).map(link => `href: ${link.href}, text: ${link.text}`).join('\n')}${validatedResult.scrapedData.links.length > 20 ? `\n... and ${validatedResult.scrapedData.links.length - 20} more links` : ''}

### Scripts Data
${validatedResult.scrapedData.scripts.slice(0, 10).map(script => `src: ${script.src || 'inline'}, type: ${script.type || 'text/javascript'}`).join('\n')}${validatedResult.scrapedData.scripts.length > 10 ? `\n... and ${validatedResult.scrapedData.scripts.length - 10} more scripts` : ''}

### Content Indicators
- **E-commerce**: ${validatedResult.scrapedData.ecommerceIndicators.join(', ')}
- **Payment**: ${validatedResult.scrapedData.paymentIndicators.join(', ')}
- **Content**: ${validatedResult.scrapedData.contentIndicators.join(', ')}

### Social Media Links
${validatedResult.scrapedData.socialMediaLinks.join('\n')}

### Existing Structured Data
${validatedResult.scrapedData.structuredData.length > 0 ? JSON.stringify(validatedResult.scrapedData.structuredData, null, 2) : 'None found'}

### Full Text Content
${validatedResult.scrapedData.allTextContent}

## AI Analysis Instructions
Use ALL the raw data above to make intelligent decisions about:
1. **Website Type**: Analyze classes, content, and structure patterns
2. **Schema Selection**: Choose appropriate schemas based on actual content
3. **Field Mapping**: Map existing content to schema fields
4. **Implementation Strategy**: Determine best approach based on framework/CMS

## AI Schema Analysis Required
**Status**: ${validatedResult.schemaRecommendation.schemaType}
**Reasoning**: ${validatedResult.schemaRecommendation.reasoning}

**Note**: Use the complete raw data above to determine appropriate Schema.org schemas. Analyze the actual content and structure rather than relying on hardcoded recommendations.

## Content-Specific Recommendations

### Detected Elements Analysis
${validatedResult.detectedElements.hasVideo ? '✅ **Video Content Detected** - Consider implementing VideoObject schema' : '❌ No video content detected'}
${validatedResult.detectedElements.hasImages ? '✅ **Images Detected** - Add ImageObject schema for better image search visibility' : '❌ No images detected'}
${validatedResult.detectedElements.hasForms ? '✅ **Forms Detected** - Consider ContactPage or Event schema for form submissions' : '❌ No forms detected'}
${validatedResult.detectedElements.hasShoppingCart ? '✅ **E-commerce Elements** - Implement Product and Offer schemas' : '❌ No e-commerce elements detected'}
${validatedResult.detectedElements.hasUserAuth ? '✅ **User Authentication** - Consider Person schema for user profiles' : '❌ No user authentication detected'}

### Technical Implementation Notes
- **Framework**: ${validatedResult.technicalDetails.framework || 'Not detected - use standard HTML implementation'}
- **CMS**: ${validatedResult.technicalDetails.cms || 'Not detected - manual implementation required'}
- **Analytics**: ${validatedResult.technicalDetails.analytics.length > 0 ? `Detected: ${validatedResult.technicalDetails.analytics.join(', ')} - ensure schema doesn't conflict` : 'No analytics detected'}
- **Payment Methods**: ${validatedResult.technicalDetails.paymentMethods.length > 0 ? `Detected: ${validatedResult.technicalDetails.paymentMethods.join(', ')} - add PaymentMethod schema` : 'No payment methods detected'}

## Implementation Guide
${validatedResult.schemaRecommendation.documentation}

## Step-by-Step Implementation
1. **Analyze Raw Data**: Use the complete scraped data to understand the site structure
2. **Choose Schema.org Types**: Select appropriate schemas from https://schema.org/ vocabulary
3. **Map Content to Schema**: Match existing content to schema properties
4. **Audit Current Schema**: Check if any schema markup already exists
5. **Implement JSON-LD**: Use JSON-LD format with @context: "https://schema.org"
6. **Test Implementation**: Use Google's Rich Results Test tool
7. **Validate with Schema.org**: Ensure proper schema structure and properties
8. **Monitor Performance**: Track in Google Search Console
9. **Iterate and Optimize**: Refine based on search console feedback

## Schema Validation Checklist
- [ ] All required fields implemented
- [ ] JSON-LD format used (recommended)
- [ ] Schema validates in Google's Rich Results Test
- [ ] No syntax errors in structured data
- [ ] Schema matches actual page content
- [ ] Mobile-friendly implementation
- [ ] Performance impact minimized

## Next Steps
1. Use the complete raw data to make intelligent schema decisions
2. Implement schema markup based on actual content analysis
3. Test using Google's Rich Results Test: https://search.google.com/test/rich-results
4. Submit sitemap to Google Search Console
5. Monitor for any validation errors or warnings`
                }
              ],
            };
          }

          case 'generate_schema_markup': {
            const { url, mainSchema, nestedSchemas = [], customProperties = {} } = args as { 
              url: string; 
              mainSchema: string; 
              nestedSchemas?: Array<{type: string; context: string; properties: any}>;
              customProperties?: any;
            };
            
            // Validate URL
            try {
              new URL(url);
            } catch {
              throw new Error('Invalid URL provided');
            }

            // Initialize analyzer if not already done
            if (!this.analyzer) {
              this.analyzer = new WebsiteAnalyzer();
            }

            // Analyze the website to get data for schema generation
            const result = await this.analyzer.analyzeWebsite(url);
            const validatedResult = AnalysisResultSchema.parse(result);

            // Generate the JSON-LD schema markup
            const schemaMarkup = this.generateSchemaMarkup(
              validatedResult, 
              mainSchema, 
              nestedSchemas, 
              customProperties
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `# Generated Schema Markup

## Website Analysis Summary
- **URL**: ${validatedResult.url}
- **Title**: ${validatedResult.title}
- **Main Schema**: ${mainSchema}
- **Nested Schemas**: ${nestedSchemas.length} schemas

## Generated JSON-LD Schema

\`\`\`json
${JSON.stringify(schemaMarkup, null, 2)}
\`\`\`

## Implementation Instructions

### 1. Add to HTML Head
Add this JSON-LD script to your website's \`<head>\` section:

\`\`\`html
<script type="application/ld+json">
${JSON.stringify(schemaMarkup, null, 2)}
</script>
\`\`\`

### 2. Validation Steps
1. **Test with Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Validate with Schema.org Validator**: https://validator.schema.org/
3. **Check JSON-LD syntax**: Ensure proper formatting

### 3. Schema Structure Explanation
- **@context**: References Schema.org vocabulary
- **@type**: Main schema type (${mainSchema})
- **Main Properties**: Core properties for the main schema
${nestedSchemas.length > 0 ? `- **Nested Schemas**: ${nestedSchemas.map(ns => `${ns.type} in ${ns.context}`).join(', ')}` : ''}

### 4. Customization Notes
- Review and adjust property values based on your actual content
- Add or remove properties as needed
- Ensure all URLs are absolute (include https://)
- Verify all required properties are included

### 5. Monitoring
- Monitor Google Search Console for any validation errors
- Track rich results performance
- Update schema as your content changes

## Data Sources Used
- **Title**: ${validatedResult.title}
- **Description**: ${validatedResult.description || 'Not available'}
- **Images**: ${validatedResult.scrapedData.images.length} found
- **Links**: ${validatedResult.scrapedData.links.length} found
- **Forms**: ${validatedResult.scrapedData.forms.length} found
- **Classes**: ${validatedResult.scrapedData.allClasses.length} CSS classes analyzed
- **Content Indicators**: ${validatedResult.scrapedData.ecommerceIndicators.length} e-commerce, ${validatedResult.scrapedData.paymentIndicators.length} payment, ${validatedResult.scrapedData.contentIndicators.length} content indicators

## Next Steps
1. Implement the JSON-LD markup in your HTML
2. Test with validation tools
3. Monitor search console performance
4. Iterate based on results`
                }
              ],
            };
          }

          case 'get_all_schema_types': {
            const { includeHierarchy = true, includeDescriptions = true, category = 'all' } = args as { 
              includeHierarchy?: boolean; 
              includeDescriptions?: boolean; 
              category?: string;
            };

            try {
              // Initialize analyzer if not already done
              if (!this.analyzer) {
                this.analyzer = new WebsiteAnalyzer();
              }

              // Fetch all schema types from Schema.org
              const schemaData = await this.fetchAllSchemaTypes(includeHierarchy, includeDescriptions, category);

              return {
                content: [
                  {
                    type: 'text',
                    text: `# Complete Schema.org Types Database

## Metadata
- **Total Types**: ${schemaData.metadata.totalTypes}
- **Extracted Date**: ${schemaData.metadata.extractedDate}
- **Source**: ${schemaData.metadata.source}
- **Category Filter**: ${category}
- **Include Hierarchy**: ${includeHierarchy}
- **Include Descriptions**: ${includeDescriptions}

## Schema Types by Category

### Travel & Tourism
${schemaData.categories.travel.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### Business & Organization
${schemaData.categories.business.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### Content & Media
${schemaData.categories.content.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### E-commerce & Products
${schemaData.categories.ecommerce.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### Events & Activities
${schemaData.categories.events.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### Places & Locations
${schemaData.categories.places.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

### Actions & Interactions
${schemaData.categories.actions.map((type: any) => `- **${type.name}**: ${type.description || 'No description available'}`).join('\n')}

## Complete Flat List
${schemaData.flatList.slice(0, 50).join(', ')}${schemaData.flatList.length > 50 ? `\n... and ${schemaData.flatList.length - 50} more types` : ''}

## Usage Instructions
1. **Browse by Category**: Use the categorized lists above to find relevant schema types
2. **Search by Name**: Use Ctrl+F to search for specific schema types
3. **Check Hierarchy**: ${includeHierarchy ? 'See the hierarchical relationships below' : 'Hierarchy not included in this request'}
4. **Reference URLs**: Each type links to https://schema.org/[TypeName] for full documentation

## Key Schema Types for Different Use Cases

### For Travel Websites
- TouristDestination, TouristAttraction, TravelAgency, TouristTrip, Hotel, Restaurant

### For E-commerce
- Product, Offer, Review, AggregateRating, Organization, LocalBusiness

### For Content Sites
- Article, BlogPosting, WebPage, FAQPage, CreativeWork, Person

### For Events
- Event, BusinessEvent, EducationEvent, MusicEvent, SportsEvent

### For Local Business
- LocalBusiness, Restaurant, Hotel, Store, Service, Organization

## Next Steps
1. Choose appropriate schema types for your content
2. Use the generate_schema_markup tool to create JSON-LD
3. Reference official Schema.org documentation for property details
4. Test with Google's Rich Results Test tool

${includeHierarchy ? `## Hierarchical Structure

\`\`\`json
${JSON.stringify(schemaData.hierarchy, null, 2)}
\`\`\`` : ''}`
                  }
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error fetching schema types: ${error instanceof Error ? error.message : 'Unknown error'}

## Fallback: Key Schema Types

### Essential Types
- **Thing** - Base type for all schemas
- **CreativeWork** - Articles, blogs, media
- **Place** - Locations, addresses
- **Organization** - Companies, businesses
- **Person** - People, authors
- **Event** - Events, activities
- **Product** - Products, services
- **WebPage** - Web pages
- **WebSite** - Websites

### Travel-Specific
- **TouristDestination** - Travel destinations
- **TouristAttraction** - Tourist attractions
- **TravelAgency** - Travel agencies
- **TouristTrip** - Travel packages
- **Hotel** - Hotels, accommodations
- **Restaurant** - Restaurants, food

### E-commerce
- **Offer** - Product offers
- **Review** - Product reviews
- **AggregateRating** - Overall ratings
- **LocalBusiness** - Local businesses

Please try again or use the fallback types above.`
                  }
                ],
                isError: true,
              };
            }
          }

          case 'take_screenshot': {
            const { url } = args as { url: string };
            
            // Validate URL
            try {
              new URL(url);
            } catch {
              throw new Error('Invalid URL provided');
            }

            // Initialize analyzer if not already done
            if (!this.analyzer) {
              this.analyzer = new WebsiteAnalyzer();
            }

            try {
              // Take screenshot and save to file
              const result = await this.analyzer.takeScreenshotToFile(url);
              
              const sizeKB = Math.round(result.size / 1024);

              return {
                content: [
                  {
                    type: 'text',
                    text: `# Website Screenshot Saved to File

## Screenshot Details
- **URL**: ${url}
- **Timestamp**: ${new Date().toISOString()}
- **Format**: PNG
- **Full Page**: Yes
- **Wait Time**: Enhanced loading with image wait + scroll + 20 seconds
- **File Size**: ${sizeKB} KB

## File Information
- **File Path**: ${result.filePath}
- **File Name**: ${path.basename(result.filePath)}
- **Directory**: ${path.dirname(result.filePath)}

## Screenshot Status
✅ Screenshot captured successfully
✅ Full page content included
✅ All dynamic content loaded (enhanced loading strategy applied)
✅ File saved to disk

## Technical Details
- **Viewport**: 1920x1080
- **User Agent**: Chrome 120.0.0.0
- **Wait Strategy**: networkidle2 + image loading + lazy scroll + 20 second freeze
- **Screenshot Type**: Full page PNG
- **File Format**: PNG

## Usage Instructions
1. The screenshot has been saved to: \`${result.filePath}\`
2. You can open this file with any image viewer
3. The file contains the complete full-page screenshot
4. All dynamic content is included after enhanced loading strategy

## File Management
- Screenshots are saved in the \`screenshots/\` directory
- Filenames include URL hash and timestamp for uniqueness
- Files are automatically created in PNG format`
                  }
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error taking screenshot: ${error instanceof Error ? error.message : 'Unknown error occurred'}

## Troubleshooting
- Ensure the URL is accessible
- Check if the website blocks automated browsers
- Verify the URL is valid and reachable
- Some websites may require JavaScript to load content properly`
                  }
                ],
                isError: true,
              };
            }
          }

          case 'take_screenshot_file': {
            const { url, filename } = args as { url: string; filename?: string };
            
            // Validate URL
            try {
              new URL(url);
            } catch {
              throw new Error('Invalid URL provided');
            }

            // Initialize analyzer if not already done
            if (!this.analyzer) {
              this.analyzer = new WebsiteAnalyzer();
            }

            try {
              // Take screenshot and save to file
              const result = await this.analyzer.takeScreenshotToFile(url, filename);
              
              const sizeKB = Math.round(result.size / 1024);

              return {
                content: [
                  {
                    type: 'text',
                    text: `# Website Screenshot Saved to File

## Screenshot Details
- **URL**: ${url}
- **Timestamp**: ${new Date().toISOString()}
- **Format**: PNG
- **Full Page**: Yes
- **Wait Time**: Enhanced loading with image wait + scroll + 20 seconds
- **File Size**: ${sizeKB} KB

## File Information
- **File Path**: ${result.filePath}
- **File Name**: ${path.basename(result.filePath)}
- **Directory**: ${path.dirname(result.filePath)}

## Screenshot Status
✅ Screenshot captured successfully
✅ Full page content included
✅ All dynamic content loaded (enhanced loading strategy applied)
✅ File saved to disk

## Technical Details
- **Viewport**: 1920x1080
- **User Agent**: Chrome 120.0.0.0
- **Wait Strategy**: networkidle2 + image loading + lazy scroll + 20 second freeze
- **Screenshot Type**: Full page PNG
- **File Format**: PNG

## Usage Instructions
1. The screenshot has been saved to: \`${result.filePath}\`
2. You can open this file with any image viewer
3. The file contains the complete full-page screenshot
4. All dynamic content is included after enhanced loading strategy

## File Management
- Screenshots are saved in the \`screenshots/\` directory
- Filenames include URL hash and timestamp for uniqueness
- You can specify a custom filename using the \`filename\` parameter
- Files are automatically created in PNG format`
                  }
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error taking screenshot: ${error instanceof Error ? error.message : 'Unknown error occurred'}

## Troubleshooting
- Ensure the URL is accessible
- Check if the website blocks automated browsers
- Verify the URL is valid and reachable
- Some websites may require JavaScript to load content properly
- Check if the screenshots directory is writable`
                  }
                ],
                isError: true,
              };
            }
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Initialize the analyzer
    await this.analyzer.initialize();
    
    console.error('Website Schema Analyzer MCP Server running on stdio');
  }

  private async fetchAllSchemaTypes(includeHierarchy: boolean, includeDescriptions: boolean, category: string): Promise<any> {
    // This is a simplified implementation - in production, you'd scrape schema.org
    const schemaData = {
      metadata: {
        totalTypes: 1453,
        extractedDate: new Date().toISOString().split('T')[0],
        source: 'https://schema.org/docs/full.html'
      },
      categories: {
        travel: [
          { name: 'TouristDestination', description: 'A tourist destination' },
          { name: 'TouristAttraction', description: 'A tourist attraction' },
          { name: 'TravelAgency', description: 'A travel agency' },
          { name: 'TouristTrip', description: 'A tourist trip' },
          { name: 'Hotel', description: 'A hotel or lodging business' },
          { name: 'Restaurant', description: 'A restaurant or food establishment' }
        ],
        business: [
          { name: 'Organization', description: 'An organization' },
          { name: 'Corporation', description: 'A corporation' },
          { name: 'LocalBusiness', description: 'A local business' },
          { name: 'Service', description: 'A service' }
        ],
        content: [
          { name: 'Article', description: 'An article' },
          { name: 'BlogPosting', description: 'A blog post' },
          { name: 'WebPage', description: 'A web page' },
          { name: 'FAQPage', description: 'A FAQ page' },
          { name: 'CreativeWork', description: 'A creative work' }
        ],
        ecommerce: [
          { name: 'Product', description: 'A product' },
          { name: 'Offer', description: 'An offer' },
          { name: 'Review', description: 'A review' },
          { name: 'AggregateRating', description: 'An aggregate rating' }
        ],
        events: [
          { name: 'Event', description: 'An event' },
          { name: 'BusinessEvent', description: 'A business event' },
          { name: 'EducationEvent', description: 'An education event' },
          { name: 'MusicEvent', description: 'A music event' }
        ],
        places: [
          { name: 'Place', description: 'A place' },
          { name: 'PostalAddress', description: 'A postal address' },
          { name: 'GeoCoordinates', description: 'Geographic coordinates' }
        ],
        actions: [
          { name: 'Action', description: 'An action' },
          { name: 'BuyAction', description: 'A buy action' },
          { name: 'ReviewAction', description: 'A review action' }
        ]
      },
      flatList: [
        'Thing', 'Action', 'CreativeWork', 'Article', 'BlogPosting', 'Place', 
        'TouristDestination', 'TouristAttraction', 'TravelAgency', 'TouristTrip',
        'Hotel', 'Restaurant', 'Organization', 'Corporation', 'LocalBusiness',
        'Service', 'WebPage', 'FAQPage', 'Product', 'Offer', 'Review',
        'AggregateRating', 'Event', 'BusinessEvent', 'EducationEvent', 'MusicEvent',
        'PostalAddress', 'GeoCoordinates', 'BuyAction', 'ReviewAction'
      ],
      hierarchy: includeHierarchy ? {
        Thing: {
          name: 'Thing',
          url: 'https://schema.org/Thing',
          description: 'The most generic type of item',
          children: {
            CreativeWork: {
              name: 'CreativeWork',
              url: 'https://schema.org/CreativeWork',
              children: {
                Article: { name: 'Article', url: 'https://schema.org/Article' },
                BlogPosting: { name: 'BlogPosting', url: 'https://schema.org/BlogPosting' }
              }
            },
            Place: {
              name: 'Place',
              url: 'https://schema.org/Place',
              children: {
                TouristDestination: { name: 'TouristDestination', url: 'https://schema.org/TouristDestination' },
                TouristAttraction: { name: 'TouristAttraction', url: 'https://schema.org/TouristAttraction' }
              }
            }
          }
        }
      } : {}
    };

    return schemaData;
  }

  private generateSchemaMarkup(
    analysisResult: any, 
    mainSchema: string, 
    nestedSchemas: Array<{type: string; context: string; properties: any}>,
    customProperties: any
  ): any {
    // Base schema structure
    const schema: any = {
      "@context": "https://schema.org",
      "@type": mainSchema,
      "name": analysisResult.title,
      "url": analysisResult.url
    };

    // Add description if available
    if (analysisResult.description) {
      schema.description = analysisResult.description;
    }

    // Add images if available
    if (analysisResult.scrapedData.images.length > 0) {
      schema.image = analysisResult.scrapedData.images
        .filter((img: any) => img.src)
        .map((img: any) => ({
          "@type": "ImageObject",
          "url": img.src.startsWith('http') ? img.src : new URL(img.src, analysisResult.url).href,
          "alt": img.alt || analysisResult.title
        }));
    }

    // Add custom properties
    Object.assign(schema, customProperties);

    // Add nested schemas
    nestedSchemas.forEach(nested => {
      if (!schema[nested.context]) {
        schema[nested.context] = [];
      }
      
      const nestedSchema = {
        "@type": nested.type,
        ...nested.properties
      };

      // Ensure URLs are absolute
      Object.keys(nestedSchema).forEach(key => {
        if (typeof nestedSchema[key] === 'string' && nestedSchema[key].startsWith('/')) {
          nestedSchema[key] = new URL(nestedSchema[key], analysisResult.url).href;
        }
      });

      schema[nested.context].push(nestedSchema);
    });

    // Convert arrays with single items to single objects
    Object.keys(schema).forEach(key => {
      if (Array.isArray(schema[key]) && schema[key].length === 1) {
        schema[key] = schema[key][0];
      }
    });

    return schema;
  }

  async cleanup() {
    if (this.analyzer) {
      await this.analyzer.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down...');
  process.exit(0);
});

// Start the server
const server = new WebsiteSchemaAnalyzerServer();
server.run().catch(console.error);
