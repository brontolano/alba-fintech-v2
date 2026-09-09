const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const configPath = path.resolve('tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const config = configFile.config;
config.compilerOptions = config.compilerOptions || {};
config.compilerOptions.incremental = false;
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length === 0) {
    console.log('No type errors found.');
    process.exit(0);
} else {
    diagnostics.forEach(d => {
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        let loc = '';
        if (d.file && d.start) {
            const { line, character } = ts.getLineAndCharacterOfPosition(d.file, d.start);
            loc = `${d.file.fileName}:${line + 1}:${character + 1} - `;
        }
        console.error(`${loc}${msg}`);
    });
    console.error(`\nTotal errors: ${diagnostics.length}`);
    process.exit(1);
}
