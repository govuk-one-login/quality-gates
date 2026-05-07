import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

export function loadManifestAndWorkflows(directory) {
    const ret = {
        manifest: {
            text: undefined
        },
        workflows: []
    }

    try {
        const manifestPath = join(directory, 'quality-gate.manifest.json');
        const manifestContent = readFileSync(manifestPath, 'utf8');
        ret.manifest.text = JSON.parse(manifestContent);
    } catch (error) {
        console.warn(`manifest file not found or invalid JSON`)
    }

    try {
        const workflowsDir = join(directory, '.github', 'workflows');
        const files = readdirSync(workflowsDir);
        ret.workflows = {
            entries: files
                .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
                .map(file => {
                    const content = readFileSync(join(workflowsDir, file), 'utf8');
                    return {
                        name: file,
                        object: {
                            text: YAML.parse(content)
                        }
                    };
                })
        };
    } catch (error) {
        console.warn(`workflows directory not found or invalid YAML`)
    }

    return ret;
}
