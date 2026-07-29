/**
 * monaco-editor ships its basic-language grammars as plain .js with no .d.ts,
 * so importing one directly (rather than through its `.contribution`) is an
 * implicit-any error. See lib/monacoSetup.ts for why Python is imported this
 * way instead of via the lazy contribution.
 */
declare module 'monaco-editor/esm/vs/basic-languages/python/python' {
    import type { languages } from 'monaco-editor/esm/vs/editor/editor.api'
    export const conf: languages.LanguageConfiguration
    export const language: languages.IMonarchLanguage
}
