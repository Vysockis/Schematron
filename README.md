# Website Schema Analyzer MCP Tool

An MCP (Model Context Protocol) tool that analyzes websites to determine their type and provides schema markup recommendations for better SEO and search visibility.

## Features

- **Complete Data Scraping**: Uses Puppeteer to scrape ALL website data and avoid detection
- **AI-Powered Analysis**: Provides complete raw data for Cloud AI to make intelligent decisions
- **Schema.org Integration**: References official Schema.org vocabulary (https://schema.org/)
- **No Hardcoded Values**: Lets AI analyze actual content and choose appropriate schemas
- **Comprehensive Data**: Collects classes, IDs, content, forms, images, videos, and more
- **Technical Analysis**: Detects frameworks, CMS, analytics tools, and payment methods

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run the MCP server:
```bash
npm start
```

## Usage

### Available Tools

#### 1. `analyze_website`
Analyzes a website and provides comprehensive schema recommendations.

**Parameters:**
- `url` (string, required): The URL of the website to analyze

**Example:**
```json
{
  "name": "analyze_website",
  "arguments": {
    "url": "https://example.com"
  }
}
```

#### 2. `get_schema_recommendations`
Get detailed schema recommendations by analyzing a specific website URL.

**Parameters:**
- `url` (string, required): The URL of the website to analyze and get recommendations for

**Example:**
```json
{
  "name": "get_schema_recommendations",
  "arguments": {
    "url": "https://example.com"
  }
}
```

#### 3. `generate_schema_markup`
Generate actual JSON-LD schema markup based on AI-selected main and nested schemas.

**Parameters:**
- `url` (string, required): The URL of the website to generate schema for
- `mainSchema` (string, required): The main Schema.org type (e.g., Product, Article, Organization)
- `nestedSchemas` (array, optional): Array of nested schemas with their types and properties
- `customProperties` (object, optional): Additional custom properties to include

**Example:**
```json
{
  "name": "generate_schema_markup",
  "arguments": {
    "url": "https://example.com",
    "mainSchema": "Product",
    "nestedSchemas": [
      {
        "type": "Offer",
        "context": "offers",
        "properties": {
          "price": "29.99",
          "priceCurrency": "USD",
          "availability": "InStock"
        }
      }
    ],
    "customProperties": {
      "brand": "Example Brand",
      "sku": "12345"
    }
  }
}
```

#### 4. `get_all_schema_types`
Fetch all Schema.org types with hierarchical relationships from the official website.

**Parameters:**
- `includeHierarchy` (boolean, optional): Whether to include the hierarchical tree structure (default: true)
- `includeDescriptions` (boolean, optional): Whether to include type descriptions (default: true)
- `category` (string, optional): Filter by category (travel, business, content, ecommerce, events, places, actions, all)

**Example:**
```json
{
  "name": "get_all_schema_types",
  "arguments": {
    "includeHierarchy": true,
    "includeDescriptions": true,
    "category": "travel"
  }
}
```

## AI-Powered Analysis

The tool provides complete raw data for Cloud AI to analyze and make intelligent decisions about:

### Data Collected
- **All CSS Classes** - Every class found on the page
- **All Element IDs** - Complete list of IDs
- **All Meta Tags** - Complete metadata
- **All Images** - With src, alt, dimensions
- **All Videos** - Including embedded content
- **All Links** - With href and text content
- **All Forms** - With inputs, actions, methods
- **All Scripts** - External and inline
- **Content Indicators** - E-commerce, payment, content keywords
- **Social Media Links** - All social platform links
- **Full Text Content** - Complete page text
- **Existing Structured Data** - Current JSON-LD markup

### Schema.org Integration
- **Official Vocabulary**: References https://schema.org/ for accurate schema types
- **No Hardcoded Values**: AI chooses appropriate schemas based on actual content
- **Multiple Schema Support**: Can recommend multiple schemas for complex websites
- **Property Mapping**: Maps existing content to schema properties
- **JSON-LD Format**: Recommends proper structured data implementation

## Technical Details

- **Puppeteer**: For web scraping with anti-detection measures
- **Cheerio**: For HTML parsing and element detection
- **TypeScript**: For type safety and better development experience
- **Zod**: For runtime validation and type checking

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Error Handling

The tool includes comprehensive error handling for:
- Invalid URLs
- Network timeouts
- Website access issues
- Parsing errors
- Validation failures

## License

MIT
