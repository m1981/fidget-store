import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parses TypeScript code and removes function bodies, leaving only signatures.
 */
function generateTsSummary(sourceCode: string): string {
    const sourceFile = ts.createSourceFile(
        'module.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );

    const bodiesToRemove: { start: number; end: number }[] = [];

    function visit(node: ts.Node) {
        // Target standard function declarations
        if (ts.isFunctionDeclaration(node) && node.body) {
            bodiesToRemove.push({
                start: node.body.getStart(sourceFile),
                end: node.body.getEnd()
            });
        }
        // Target class methods (optional, but good for SvelteKit server files)
        else if (ts.isMethodDeclaration(node) && node.body) {
            bodiesToRemove.push({
                start: node.body.getStart(sourceFile),
                end: node.body.getEnd()
            });
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Sort descending so slicing doesn't shift indices
    bodiesToRemove.sort((a, b) => b.start - a.start);

    let result = sourceCode;
    for (const { start, end } of bodiesToRemove) {
        result = result.slice(0, start) + result.slice(end);
    }

    // Clean up trailing spaces left by removed blocks
    return result.split('\n').map(line => line.trimEnd()).join('\n');
}

/**
 * Recursively finds all .ts files in a directory.
 */
function getTsFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getTsFiles(filePath, fileList);
        } else if (filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// --- Main Execution ---

// Get target directory from CLI args, default to 'src'
const targetDir = process.argv[2] || 'src';

if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory '${targetDir}' not found.`);
    process.exit(1);
}

const tsFiles = getTsFiles(targetDir);

for (const file of tsFiles) {
    const code = fs.readFileSync(file, 'utf-8');
    const summary = generateTsSummary(code);

    // Output in the requested Markdown format
    console.log(file);
    console.log('```typescript');
    console.log(summary.trim());
    console.log('```\n');
}