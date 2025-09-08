# macOS Setup Instructions

## Prerequisites

### 1. Install Node.js
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

### 2. Install Dependencies
```bash
npm install
```

## macOS-Specific Notes

### Puppeteer on macOS
- Puppeteer should work out of the box on macOS
- It will automatically download Chromium if needed
- No additional system dependencies required

### Permissions
- macOS may ask for permission to run the browser
- Grant permissions when prompted

### Troubleshooting

#### If you get permission errors:
```bash
# Make sure the script is executable
chmod +x dist/index.js
```

#### If Puppeteer fails to launch:
```bash
# Try installing Chromium manually
npx puppeteer browsers install chrome
```

#### If you get "command not found" errors:
```bash
# Make sure Node.js is in your PATH
echo $PATH
# Should include /usr/local/bin or similar
```

## Running the Application

```bash
# Build the project
npm run build

# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

## Platform Detection

The application automatically detects macOS and uses appropriate:
- User agent strings
- Browser launch arguments
- File paths (cross-platform compatible)

## Screenshots Directory

Screenshots are saved to:
```
./screenshots/
```

This directory is created automatically and works on all platforms.
