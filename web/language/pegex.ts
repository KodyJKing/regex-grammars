import * as monaco from "monaco-editor"

export const PegexLanguageName = "pegex"

let _registered = false
registerPegexLanguage()
function registerPegexLanguage() {
    if ( _registered ) return
    _registered = true

    monaco.languages.register( { id: PegexLanguageName } )

    monaco.languages.setLanguageConfiguration( PegexLanguageName, {
        wordPattern: /\w+/,
        comments: {
            lineComment: "//",
            blockComment: [ "/*", "*/" ]
        },
        brackets: [
            [ "(", ")" ],
            // [ "[", "]" ],
            [ "|", "|" ],
        ],
        autoClosingPairs: [
            // { open: '[', close: ']', notIn: [ 'string', 'comment' ] },
            { open: '(', close: ')', notIn: [ 'string', 'comment' ] },
            { open: '|', close: '|', notIn: [ 'string', 'comment' ] },
            { open: "'", close: "'", notIn: [ 'string', 'comment' ] },
            { open: '"', close: '"', notIn: [ 'string', 'comment' ] },
            { open: '/*', close: '*/', notIn: [ 'string', 'comment' ] }
        ],
        surroundingPairs: [
            // { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '|', close: '|' },
            { open: "'", close: "'" },
            { open: '"', close: '"' }
        ],
    } )

    monaco.languages.setMonarchTokensProvider( PegexLanguageName, {
        // Set defaultToken to invalid to see what you do not tokenize yet
        // defaultToken: 'invalid',

        operators: [
            "+?", "*?", "??", "+", "*", "?",
            "<&", "<!", "&", "!", "=", ":"
        ],

        // we include these common regular expressions
        symbols: /[=><!~?:&|+*\/]+/,

        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        char_class: /\[\^?(?:[^\\\[\]]|\\.)*\]/,

        // The main tokenizer for our languages
        tokenizer: {
            root: [
                // Label
                [ /[\w$]+(?=:)/, 'variable' ],
                // Rule Identifier
                [ /[\w$]+/, 'type.identifier' ],

                { include: '@whitespace' },

                [ /[()]/, '@brackets' ],

                [ /@symbols/, {
                    cases: {
                        '@operators': 'operator',
                        '@default': ''
                    }
                } ],

                // delimiter: after number because of .\d floats
                [ /,/, 'delimiter' ],

                // strings
                [ /"([^"\\]|\\.)*$/, 'string.invalid' ], // non-teminated string
                [ /'([^'\\]|\\.)*$/, 'string.invalid' ], // non-teminated string
                [ /"/, 'string', '@string_double' ],
                [ /'/, 'string', '@string_single' ],

                [ /\[\^?(?:[^\\\[\]]|\\.)*\]/, "char_class" ],

                // Regex escape classes
                [ /\\[dDwWsSbB]/, "number" ],
            ],

            comment: [
                [ /[^\/*]+/, 'comment' ],
                [ /\/\*/, 'comment', '@push' ],    // nested comment
                [ "\\*/", 'comment', '@pop' ],
                [ /[\/*]/, 'comment' ]
            ],

            string_double: [
                [ /[^\\"]+/, 'string' ],
                [ /@escapes/, 'string.escape' ],
                [ /\\./, 'string.escape.invalid' ],
                [ /"/, 'string', '@pop' ]
            ],

            string_single: [
                [ /[^\\']+/, 'string' ],
                [ /@escapes/, 'string.escape' ],
                [ /\\./, 'string.escape.invalid' ],
                [ /'/, 'string', '@pop' ]
            ],

            whitespace: [
                [ /[ \t\r\n]+/, 'white' ],
                [ /\/\*/, 'comment', '@comment' ],
                [ /\/\/.*$/, 'comment' ],
            ],
        },
    } )

    // monaco.languages.register
}
