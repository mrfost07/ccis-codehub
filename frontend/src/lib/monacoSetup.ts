/**
 * Bundle Monaco locally instead of fetching it from a CDN.
 *
 * By default @monaco-editor/react pulls the editor from jsdelivr at runtime:
 *
 *     https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs
 *
 * Two problems with that here:
 *
 *  1. Availability. Students sit timed quizzes and coding challenges in this
 *     editor. If jsdelivr is blocked by a campus firewall, throttled, or the
 *     network drops, the editor never appears and the exam is unusable — a
 *     third-party outage becomes an academic incident.
 *
 *  2. Version skew. The CDN served 0.54 while package.json pins 0.44, so
 *     TypeScript checked our editor options against a version we never ran.
 *     Options silently changed type between those releases (wordBasedSuggestions
 *     went boolean -> string union), meaning a config could typecheck locally
 *     and be ignored in production.
 *
 * Importing the API directly and handing it to the loader fixes both: one
 * version, no network dependency. Only the four languages the platform offers
 * are pulled in, so this stays far smaller than the full monaco bundle.
 *
 * Import this module for its side effects BEFORE rendering any <Editor/>.
 */
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

// Only the four languages the platform offers, so this stays far smaller than
// the full monaco bundle. Each contribution brings the grammar plus the
// language configuration — bracket pairs, auto-closing quotes, and the
// onEnterRules that indent after a Python `:`.
//
// Verified in a browser against this setup: typing `def solve():` then Enter
// indents 4 spaces, `print(` closes to `print()`, and `x = "` closes the quote.
import { conf as pythonConf, language as pythonLang } from 'monaco-editor/esm/vs/basic-languages/python/python'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution'
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'

// Monaco offloads tokenisation and diffing to a worker. Vite compiles this to
// a real worker chunk via the ?worker suffix. Without it Monaco falls back to
// running on the main thread and logs a warning on every mount.
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

;(self as any).MonacoEnvironment = {
    getWorker() {
        return new EditorWorker()
    },
}

/**
 * Python is registered by hand rather than via `python.contribution`.
 *
 * The contribution registers the language with a LAZY loader that fires when
 * the first Python editor mounts — after module evaluation — so any
 * configuration set at import time is overwritten when that loader runs.
 * Registering grammar and configuration together, eagerly, removes the
 * ordering problem. (Verified: tokenisation still works through this path.)
 *
 * `indentationRules` are added because the bundled Python language ships only
 * a single onEnterRule and no indentation rules; these mirror what VS Code's
 * Python extension supplies. Python is the default language for nearly every
 * challenge and quiz here.
 *
 * CAVEAT — not fully verified. Scripted `trigger('keyboard','type')` events
 * reproduce first-level indent, bracket closing and quote closing reliably,
 * but gave inconsistent results for *nested* indent (a pre-set indented line
 * compounds to 8, the same line typed does not), and real key events were not
 * available in the test environment. Worth eyeballing in the running editor:
 * type `def f():` Enter `for i in x:` Enter and check the third line lands at
 * 8 spaces. If it does not, the gap is Monaco's standalone autoIndent rather
 * than these rules, and the fallback is an onEnter handler in the page.
 */
monaco.languages.register({ id: 'python', extensions: ['.py'], aliases: ['Python', 'python'] })
monaco.languages.setMonarchTokensProvider('python', pythonLang)
monaco.languages.setLanguageConfiguration('python', {
    ...pythonConf,
    indentationRules: {
        // A block opener ending in a colon deepens the next line.
        increaseIndentPattern:
            /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async|match|case)\b.*:\s*(?:#.*)?$/,
        // Continuation clauses line back up with the block they belong to.
        decreaseIndentPattern: /^\s*(?:elif|else|except|finally)\b.*:\s*(?:#.*)?$/,
    },
})

loader.config({ monaco })

export default monaco
