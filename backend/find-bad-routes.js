const fs = require('fs');
const path = require('path');

console.log('Searching for malformed routes...\n');

const routeFiles = [
    './routes/profile.js',
    './routes/companies.js',
    './routes/emails.js',
    './routes/aiSearch.js',
    './routes/config.js'
];

// Patterns that might cause issues
const badPatterns = [
    /:$/,           // Ends with :
    /::/,           // Double colon
    /:\//,          // :/ (empty param)
    /:\s/,          // : followed by space
    /:\)/,          // :)
    /:\./,          // :.
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g  // Route definitions
];

routeFiles.forEach(file => {
    console.log(`\nChecking ${file}...`);
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            // Check for route definitions
            const routeMatch = line.match(/router\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (routeMatch) {
                const route = routeMatch[2];
                console.log(`  Line ${index + 1}: ${routeMatch[1].toUpperCase()} ${route}`);

                // Check for bad patterns
                badPatterns.slice(0, -1).forEach(pattern => {
                    if (pattern.test(route)) {
                        console.error(`    ⚠️  SUSPICIOUS PATTERN: ${pattern}`);
                    }
                });

                // Check for malformed params
                if (route.includes(':')) {
                    const parts = route.split('/');
                    parts.forEach((part, i) => {
                        if (part.startsWith(':') && part.length === 1) {
                            console.error(`    ❌ EMPTY PARAMETER at position ${i}`);
                        }
                        if (part === ':') {
                            console.error(`    ❌ BARE COLON at position ${i}`);
                        }
                        if (part.endsWith(':') && !part.startsWith(':')) {
                            console.error(`    ❌ ENDS WITH COLON at position ${i}`);
                        }
                    });
                }
            }
        });
    } catch (error) {
        console.error(`  Error reading file: ${error.message}`);
    }
});