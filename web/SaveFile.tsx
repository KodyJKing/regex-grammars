import { ConversionOptions } from './grammarToRegex.js'
import { LocalStore } from './store/LocalStore.js'
import { undent } from '../src/utils/stringUtils.js'
import { useStore } from './hooks/useStore.js'
import { useState } from 'react'

export type SaveFile = {
    grammarSource: string
    sampleText: string
    replacementPattern: string
    flags: string
    jsReplacer: boolean
    conversionOptions: ConversionOptions
}

export function saveToSharableLink( saveFile: SaveFile ) {
    const json = JSON.stringify( saveFile )
    const encoded = btoa( json )
    const url = new URL( window.location.href )
    url.searchParams.set( "g", encoded )
    return url.toString()
}

export function saveFromSharableLink( url: URL ) {
    const encoded = url.searchParams.get( "g" )
    if ( !encoded ) return null
    const json = atob( encoded )
    const saveFile = JSON.parse( json ) as SaveFile

    // Don't run untrusted code
    saveFile.jsReplacer = false

    return saveFile
}

export const fileStore = new LocalStore<SaveFile>( "regex-grammar" )

export const defaultSave: SaveFile = {
    conversionOptions: { noNonCaptureGroups: false },
    flags: "gm",
    jsReplacer: true,
    replacementPattern: `match => match.replaceAll("/", "-")`,
    sampleText: undent( `
        This is a valid date: 03/15/1980
        This is not: 23/15/1980
        This is a another valid date: 01/12/2005
    `),
    grammarSource: undent( `
        //
        //  Convert Peggy grammars into regexes.
        //  https://peggyjs.org/
        //

        Date
            = month: MM "/" day: DD "/" year: YYYY
        DD
            = [0-2][0-9]
        MM
            = [0-1][0-9]
        YYYY
            = \\d|4|
        
        //
        //  Additions and changes to Peggy grammar:
        //

        //  Built in regex classes
        BuiltInClasses 
            = \\d / \\D / \\w / \\W / \\s / \\S 
            / \\b / \\B // Word boundary assertions.

        //  Look behind assertions
        NegativeLookBehind = <! "h" "ello" // Only match "ello" if it is not preceded by "h".
        PositiveLookBehind = <& "h" "ello" // Only match "ello" if it is preceded by "h".

        //  Lazy quantifiers
        LazyZeroOrMore = \\w*? 
        LazyOneOrMore = \\w+?
        LazyOptional = \\w??

        //  Unicode character classes
        UnicodeCharClass = \\p{Sc}

        //  Back references
        BackReference = @.\\1
        NamedBackReference = foo: . \\k<foo>

        //  The symbol $ now means what it does in regex.
        InputBoundaryAssertions 
            = ^ "Hello World" $            // Generates: /^Hello World$/

        //  Plucks transform to capture groups
        Tuple 
            = @\\d+ "," @\\d+               // Generates: /(\d+),(\d+)/

        //  Labels transform to named capture groups.
        FullName
            = first: \\w+ " " last: \\w+    // Generates: /(?<first>\w+) (?<last>\w+)/
        
        //  Repeated labels will generate an invalid regex because named captures must be unique.
        DateRange
            = (month: MM "/" day: DD "/" year: YYYY Date) "-" 
            (month: MM "/" day: DD "/" year: YYYY Date)

        //  Circular references are not allowed because regexes cannot support recursion.
        List 
            = "[" Element|.., ", "| "]"
        Element
            = Number / List
    `)
}

fileStore.set( "example", defaultSave )

