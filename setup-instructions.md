# Cloud AI Integration Setup

## Configuration Files

### 1. MCP Server Configuration
Add this to your Cloud AI MCP configuration:

```json
{
  "mcpServers": {
    "website-schema-analyzer": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "C:\\Users\\lukas\\Desktop\\Lee\\Schematron",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Cloud AI Tool Configuration
Add this to your Cloud AI tools configuration:

```json
{
  "name": "Website Schema Analyzer",
  "description": "MCP tool for analyzing websites and providing schema markup recommendations",
  "version": "1.0.0",
  "mcpServer": {
    "command": "node",
    "args": ["dist/index.js"],
    "cwd": "C:\\Users\\lukas\\Desktop\\Lee\\Schematron",
    "env": {
      "NODE_ENV": "production"
    }
  },
  "tools": [
    {
      "name": "analyze_website",
      "description": "Analyze a website to determine its type and recommend appropriate schema markup",
      "parameters": {
        "url": {
          "type": "string",
          "description": "The URL of the website to analyze",
          "required": true
        }
      }
    },
    {
      "name": "get_schema_recommendations", 
      "description": "Get detailed schema recommendations by analyzing a specific website URL",
      "parameters": {
        "url": {
          "type": "string",
          "description": "The URL of the website to analyze and get recommendations for",
          "required": true
        }
      }
    }
  ],
  "capabilities": {
    "webScraping": true,
    "schemaAnalysis": true,
    "puppeteer": true
  }
}
```

## Setup Steps

### 1. Install Dependencies
```bash
cd C:\Users\lukas\Desktop\Lee\Schematron
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Test the MCP Server
```bash
npm start
```

### 4. Add to Cloud AI
1. Copy the MCP configuration to your Cloud AI config
2. Restart Cloud AI
3. The tools should now be available in Cloud AI

## Available Tools

### `analyze_website`
- **Purpose**: Comprehensive website analysis
- **Input**: URL string
- **Output**: Complete analysis with schema recommendations

### `get_schema_recommendations`
- **Purpose**: Detailed schema implementation guide
- **Input**: URL string  
- **Output**: Step-by-step schema implementation instructions

## Usage Examples

### In Cloud AI Chat:
```
"Analyze https://example.com and tell me what schema I should implement"
```

```
"Get detailed schema recommendations for https://myshop.com"
```

## Troubleshooting

### Common Issues:
1. **Path Issues**: Ensure the `cwd` path matches your actual directory
2. **Node Not Found**: Make sure Node.js is in your PATH
3. **Dependencies**: Run `npm install` if you get module errors
4. **Build Issues**: Run `npm run build` before starting

### Testing:
```bash
# Test the MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js
```

## Security Notes
- The tool uses Puppeteer for web scraping
- It includes anti-detection measures
- No sensitive data is stored or transmitted
- All analysis is performed locally
