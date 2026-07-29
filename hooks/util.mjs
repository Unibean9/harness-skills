import fs from 'node:fs';
import path from 'node:path';

export function findProjectRoot(startDirectory) {
    let current = path.resolve(startDirectory || process.cwd());
    while (true) {
        if (fs.existsSync(path.join(current, '.hs.json'))) return current;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}
