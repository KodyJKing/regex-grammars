import * as parser from "./parser/parser.js"
import { Grammar, grammarToRegexSource } from "./grammarToRegex.js"

export const parseGrammar = parser.parse as ( source: string ) => Grammar

export function parseGrammarToRegexSource( source: string ) {
    return grammarToRegexSource( parseGrammar( source ) )
}

export function parseGrammarToRegex( source: string ) {
    return new RegExp( parseGrammarToRegexSource( source ) )
}