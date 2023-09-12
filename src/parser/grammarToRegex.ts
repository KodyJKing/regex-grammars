import { MergeIntersection } from "../utils/types"
import { escapeRegExp } from "../utils/stringUtils"
import { stringifyAST } from "../utils/stringifyAST"

type NodeTypes = { [ Key in keyof NodeFieldTypes ]: MergeIntersection<NodeFieldTypes[ Key ] & { type: Key }> }

type NodeConversionHandlers = { [ Key in keyof NodeTypes ]: ( node: NodeTypes[ Key ], ctx: Context ) => string }

type NodeTransformers = Partial<{ [ Key in keyof NodeTypes ]: ( node: NodeTypes[ Key ] ) => Node | undefined }>

type Node = NodeTypes[ keyof NodeTypes ]

export type Grammar = NodeTypes[ "grammar" ]
type Rule = NodeTypes[ "rule" ]

type Context = {
    rules: Record<string, Rule>
    stack: Node[]
}

type RepeatLimit = { value: number }

const nodePrecedences: Record<string, number> = ( function () {
    /** Nodes in increasing order of binding tightness. */
    const groups: ( keyof NodeTypes )[][] = [
        [ "literal", "sequence" ],
        [ "choice" ],
        [ "optional", "zero_or_more", "one_or_more", "repeated" ],
    ]
    let result = {}
    for ( let p = 0; p < groups.length; p++ )
        for ( let type of groups[ p ] )
            result[ type ] = p
    return result
} )()

interface NodeFieldTypes {
    grammar: { rules: NodeTypes[ "rule" ][] }
    rule: { name: string, expression: Rule }
    rule_ref: { name: string }

    built_in_class: { regexText: string }
    unicode_char_class: { regexText: string }
    back_reference: { index: number }
    named_back_reference: { name: string }
    class: { parts: string[][], inverted: boolean, ignoreCase: boolean }
    literal: { value: string, ignoreCase: boolean }
    any: {}

    sequence: { elements: Node[] }
    choice: { alternatives: Node[] }

    optional: { expression: Node }
    zero_or_more: { expression: Node }
    one_or_more: { expression: Node }
    optional_lazy: { expression: Node }
    zero_or_more_lazy: { expression: Node }
    one_or_more_lazy: { expression: Node }
    repeated: { expression: Node, min?: RepeatLimit, max: RepeatLimit, lazy: boolean, delimiter?: Node }

    labeled: { label: string, pick: boolean, expression: Node }
    group: { expression: Node }

    simple_not: { expression: Node }
    simple_and: { expression: Node }
    simple_not_behind: { expression: Node }
    simple_and_behind: { expression: Node }
    input_boundary: { regexText: string }
}

const conversionHandlers: NodeConversionHandlers = {
    grammar() { throw new Error( "Tried to convert grammar node to regex." ) },
    rule() { throw new Error( "Tried to convert rule node to regex." ) },
    rule_ref() { throw new Error( "Tried to convert rule_ref node to regex." ) },

    built_in_class( node ) { return node.regexText },
    unicode_char_class( node ) { return `\\p{${ node.regexText }}` },
    back_reference( node ) { return `\\${ node.index }` },
    named_back_reference( node ) { return `\\k<${ node.name }>` },
    class( node ) {
        if ( node.ignoreCase ) throw new Error( "Case insensitive classes are not supported." )
        let parts = node.parts.map( classPartToRegex ).join( '' )
        return ( node.inverted ? '[^' : '[' ) + parts + ']'
    },
    literal( node ) {
        if ( node.ignoreCase ) throw new Error( "Case insensitive literals are not supported." )
        return escapeRegExp( node.value )
    },
    any() { return "." },

    sequence( node, ctx ) { return node.elements.map( x => convert( x, ctx ) ).join( "" ) },
    choice( node, ctx ) { return node.alternatives.map( x => convert( x, ctx ) ).join( "|" ) },

    optional( node, ctx ) { return `${ convert( node.expression, ctx ) }?` },
    zero_or_more( node, ctx ) { return `${ convert( node.expression, ctx ) }*` },
    one_or_more( node, ctx ) { return `${ convert( node.expression, ctx ) }+` },
    optional_lazy( node, ctx ) { return `${ convert( node.expression, ctx ) }??` },
    zero_or_more_lazy( node, ctx ) { return `${ convert( node.expression, ctx ) }*?` },
    one_or_more_lazy( node, ctx ) { return `${ convert( node.expression, ctx ) }+?` },
    repeated( node, ctx ) {
        let { delimiter, min, max, lazy } = node
        if ( delimiter ) throw new Error( "The transformation phase should have removed delimiters." )
        return `${ convert( node.expression, ctx ) }${ getRepeatOp( min, max, lazy ) }`
    },

    labeled( node, ctx ) {
        if ( node.pick )
            return `(${ convert( node.expression, ctx ) })`
        return `(?<${ node.label }>${ convert( node.expression, ctx ) })`
    },
    group( node, ctx ) { return `(?:${ convert( node.expression, ctx ) })` },

    simple_not( node, ctx ) { return `(?!${ convert( node.expression, ctx ) })` },
    simple_and( node, ctx ) { return `(?=${ convert( node.expression, ctx ) })` },
    simple_not_behind( node, ctx ) { return `(?<!${ convert( node.expression, ctx ) })` },
    simple_and_behind( node, ctx ) { return `(?<=${ convert( node.expression, ctx ) })` },
    input_boundary( node ) { return node.regexText }
}

const transformers: NodeTransformers = {
    repeated( node ) {
        let { expression, delimiter, min, max, lazy } = node
        if ( delimiter ) {
            min = decrementLimit( min )
            max = decrementLimit( max ) as RepeatLimit
            let result: Node = {
                type: "sequence",
                elements: [
                    expression,
                    {
                        type: "repeated", min, max, lazy,
                        expression: { type: "sequence", elements: [ delimiter, expression ] }
                    }
                ]
            }
            // If we can have zero elements, the whole thing needs to be optional.
            if ( min?.value == 0 && max.value == null )
                result = {
                    type: lazy ? "optional_lazy" : "optional",
                    expression: {
                        type: "group",
                        expression: result
                    }
                }
            return result
        }
    }
}

function convert( node: Node, ctx: Context, replaceParent = false ): string {
    if ( !node )
        throw new Error( `Tried to convert undefined node to regex.` )

    // These types should be transparent. Convert their children instead.
    if ( node.type === "rule_ref" )
        node = ctx.rules[ node.name ]
    if ( node.type === "rule" )
        node = node.expression

    let transformer = transformers[ node.type ]
    if ( transformer ) {
        // @ts-ignore
        node = transformer( node ) ?? node
    }

    if ( ctx.stack.indexOf( node ) > -1 )
        throw new Error( "Grammar contains circular references. Cannot convert to regex." )

    let parent = ctx.stack[ ctx.stack.length - 1 ]
    let needsGrouping = mustGroupToPreserveOrderOfOperations( node, parent )
    // if ( needsGrouping ) 
    //     console.log( `Grouping to avoid order of operations error ${ parent.type }(${ node.type })` )

    let handler = conversionHandlers[ node.type ]
    if ( !handler )
        throw new Error( `Unhandled node type: ${ stringifyAST( node ) }` )

    ctx.stack.push( node )

    // @ts-ignore
    let result = handler( node, ctx )
    if ( needsGrouping )
        result = `(?:${ result })`

    ctx.stack.pop()

    return result
}

export function grammarToRegexSource( grammar: NodeTypes[ "grammar" ] ) {
    let context = createContext( grammar )
    let startRule = grammar.rules[ 0 ]
    return convert( startRule, context )
}

function createContext( grammar: NodeTypes[ "grammar" ] ) {
    let result: Context = { rules: {}, stack: [] }
    let { rules } = result
    for ( let rule of grammar.rules )
        rules[ rule.name ] = rule
    return result
}

function parentNode( ctx: Context ) {
    return ctx.stack[ ctx.stack.length - 2 ]
}

function mustGroupToPreserveOrderOfOperations( node: Node, parent?: Node ) {
    if ( !parent )
        return false
    let parentPrecedence = getPrecedence( parent )
    let childPrecedence = getPrecedence( node )
    if ( parentPrecedence === undefined || childPrecedence === undefined )
        return false
    return parentPrecedence > childPrecedence
}

function classPartToRegex( part: any ) {
    return typeof part == 'string' ? escapeRegExp( part ) : escapeRegExp( part[ 0 ] ) + '-' + escapeRegExp( part[ 1 ] )
}

function decrementLimit( limit?: RepeatLimit ) {
    if ( !limit )
        return undefined
    let { value } = limit
    if ( value == null || value == 0 )
        return { value }
    return { value: value - 1 }
}

function getRepeatOp( min: RepeatLimit | undefined, max: RepeatLimit, lazy: boolean ) {
    let op: string
    if ( !min ) {
        op = `{${ max.value }}`
    } else if ( !max.value ) {
        if ( min.value == 0 )
            op = `*`
        else
            op = `{${ min.value },}`
    } else {
        op = `${ min.value },${ max.value }`
    }
    if ( lazy )
        op += "?"
    return op
}

function getPrecedence( node: Node ) {
    return nodePrecedences[ node.type ]
}
