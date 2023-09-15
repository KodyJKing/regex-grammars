import { MergeIntersection } from "./utils/types.js"
import { escapeRegExp } from "./utils/stringUtils.js"
import { stringifyAST } from "./utils/stringifyAST.js"

type LocationPart = { offset: number, column: number, line: number }
type Location = { start: LocationPart, end: LocationPart }

type NodeBase = { location?: Location, codeLocation?: Location }

type NodeTypes = { [ Key in keyof NodeFieldTypes ]: MergeIntersection<NodeFieldTypes[ Key ] & NodeBase & { type: Key }> }

type NodeConversionHandlers = { [ Key in keyof NodeTypes ]: ( node: NodeTypes[ Key ], ctx: Context ) => string }

type NodeTransformers = Partial<{ [ Key in keyof NodeTypes ]: ( node: NodeTypes[ Key ] ) => Node | undefined }>

type Node = NodeTypes[ keyof NodeTypes ]

export type Grammar = NodeTypes[ "grammar" ]
type Rule = NodeTypes[ "rule" ]

type Context = { rules: Record<string, Rule>, stack: Node[] }

type RepeatLimit = { value: number }

interface NodeFieldTypes {
    grammar: { rules: Rule[], initializer?: Node, topLevelInitializer?: Node }
    action: {}
    semantic_and: {}
    semantic_not: {}

    named: { name: string, expression: Rule }
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
    grammar( node ) { throw createError( node, "Tried to convert grammar node to regex." ) },
    action( node ) { throw createError( node, "JavaScript actions are not supported." ) },
    semantic_and( node ) { throw createError( node, "JavaScript assertions are not supported." ) },
    semantic_not( node ) { throw createError( node, "JavaScript assertions are not supported." ) },

    named( node, ctx ) { return convert( node.expression, ctx ) },
    rule( node, ctx ) { return convert( node.expression, ctx ) },
    rule_ref( node, ctx ) {
        let referencedRule = ctx.rules[ node.name ]
        if ( !referencedRule )
            throw createError( node, `Referenced rule "${ node.name }" does not exist.` )
        return convert( referencedRule, ctx )
    },

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

    optional: convertUnary( text => `${ text }?` ),
    zero_or_more: convertUnary( text => `${ text }*` ),
    one_or_more: convertUnary( text => `${ text }+` ),
    optional_lazy: convertUnary( text => `${ text }??` ),
    zero_or_more_lazy: convertUnary( text => `${ text }*?` ),
    one_or_more_lazy: convertUnary( text => `${ text }+?` ),
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

    simple_not: convertUnary( text => `(?!${ text })` ),
    simple_and: convertUnary( text => `(?=${ text })` ),
    simple_not_behind: convertUnary( text => `(?<!${ text })` ),
    simple_and_behind: convertUnary( text => `(?<=${ text })` ),
    input_boundary( node ) { return node.regexText }
}

function convertUnary( wrapText: ( text: string ) => string ) {
    return function ( node: Node & { expression: Node }, ctx: Context ) {
        return wrapText( convert( node.expression, ctx ) )
    }
}

const transformers: NodeTransformers = {
    repeated( node ) {
        let { expression, delimiter, min, max, lazy } = node
        if ( delimiter ) {
            let result: Node = {
                type: "sequence",
                elements: [
                    expression,
                    {
                        type: "repeated", lazy,
                        min: decrementLimit( min ),
                        max: decrementLimit( max ) as RepeatLimit,
                        expression: { type: "sequence", elements: [ delimiter, expression ] }
                    }
                ]
            }
            if ( min?.value == 0 )
                result = { type: lazy ? "optional_lazy" : "optional", expression: result }
            return result
        }
    }
}

function convert( node: Node, ctx: Context ): string {
    if ( !node )
        throw createError( ctx.stack[ ctx.stack.length - 1 ], `Tried to convert undefined node to regex.` )

    let transformer = transformers[ node.type ] as ( node: Node ) => Node
    if ( transformer )
        node = transformer( node ) ?? node

    let handler = conversionHandlers[ node.type ] as ( node: Node, ctx: Context ) => string
    if ( !handler )
        throw createError( node, `Unhandled node type: ${ node.type }` )

    if ( ctx.stack.indexOf( node ) > -1 ) {
        let cycle = ruleNamesOnStack( ctx )
        if ( node.type === "rule" )
            cycle = cycle.concat( [ node.name ] )
        throw createError( node, `Grammar contains circular reference: ${ cycle.join( " -> " ) }` )
    }

    ctx.stack.push( node )

    let result = handler( node, ctx )

    let parent = parentExpressions( ctx )
    if ( mustGroupToPreserveOrderOfOperations( node, parent ) ) {
        result = `(?:${ result })`
        console.log( `Grouping to avoid order of operations error ${ parent?.type }(${ node.type })` )
    }

    ctx.stack.pop()

    return result
}

function createError( node: Node | undefined, message: string ) {
    if ( !node )
        return new Error( message )
    return Object.assign(
        new Error( message ),
        { location: node.location ?? node.codeLocation }
    )
}

export function grammarToRegexSource( grammar: Grammar ) {
    if ( grammar.initializer ) throw createError( grammar.initializer, "JavaScript initializers are not supported." )
    if ( grammar.topLevelInitializer ) throw createError( grammar.topLevelInitializer, "JavaScript initializers are not supported." )

    let context = createContext( grammar )
    let startRule: Node = grammar.rules[ 0 ]
    return convert( startRule, context )
}

function createContext( grammar: Grammar ) {
    let result: Context = { rules: {}, stack: [] }
    let { rules } = result
    for ( let rule of grammar.rules ) {
        if ( rules[ rule.name ] )
            throw createError( rule, `Redeclaration of rule: ${ rule.name }` )
        rules[ rule.name ] = rule
    }
    return result
}

/** These types would be removed by inlining, so we skip over them when looking for parent nodes. */
const transparentTypes: ( keyof NodeTypes )[] = [ "rule", "rule_ref", "named" ]
//
function parentExpressions( ctx: Context ): Node | undefined {
    for ( let i = ctx.stack.length - 2; i >= 0; i-- ) {
        let parent = ctx.stack[ i ]
        if ( !parent )
            return
        if ( transparentTypes.indexOf( parent.type ) === -1 )
            return parent
    }
}

function ruleNamesOnStack( ctx: Context ) {
    return ctx.stack.filter( node => node.type === "rule" ).map( node => ( node as Rule ).name )
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
        op = `{${ min.value },${ max.value }}`
    }
    if ( lazy )
        op += "?"
    return op
}

/**
 * A map of operation precedences, used to parenthesize when necessary. Any undefined node type will be ignored.
 */
const nodePrecedences: Record<string, number> = ( function () {

    /** Nodes in increasing order of binding tightness. */
    const groups: ( keyof NodeTypes )[][] = [

        [ "choice" ],

        /*
         * In regex, a literal is not atomic, it's a sequence of char literals,
         * so it can be broken by order-of-operations. For example: /foo?/ parses as /fo(o?)/
         */
        [ "sequence", "literal" ],

        [ "zero_or_more", "one_or_more", "repeated", "optional_lazy", "zero_or_more_lazy", "one_or_more_lazy", "repeated" ],

        /*
         * Optional expressions need higher precedence than other quantifiers
         * to avoid ambiguities like: (.+)? vs .+?
         */
        [ "optional" ],

    ]

    let result = {}
    for ( let p = 0; p < groups.length; p++ )
        for ( let type of groups[ p ] )
            result[ type ] = p
    return result

} )()

function getPrecedence( node: Node ) {
    // If a literal has one or fewer characters, it's atomic and can't be broken by order-of-operations.
    if ( node.type == "literal" && node.value.length < 2 )
        return undefined

    return nodePrecedences[ node.type ]
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