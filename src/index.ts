import * as parser from "./parser/parser.js"
import { ConversionOptions, Grammar, grammarToRegexSource } from "./grammarToRegex.js"

export const parseGrammar = parser.parse as ( source: string ) => Grammar

export function parseGrammarToRegexSource( source: string, options?: ConversionOptions ) {
    return grammarToRegexSource( parseGrammar( source ), options )
}

export function parseGrammarToRegex( source: string, options?: ConversionOptions ) {
    return new RegExp( parseGrammarToRegexSource( source, options ) )
}