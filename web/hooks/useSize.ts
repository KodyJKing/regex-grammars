import { useEffect, useRef, useState } from "react"

type Size = [ number, number ]

export function useSize( ref: React.MutableRefObject<Element | null> ) {
    const [ size, setSize ] = useState<Size>( [ 0, 0 ] )
    const [ width, height ] = size

    const observer = new ResizeObserver( () => {
        const element = ref.current
        if ( !element ) return
        const rect = element.getBoundingClientRect()
        if ( rect.width !== width || rect.height !== height )
            setSize( [ rect.width, rect.height ] )
    } )

    useEffect( () => {
        if ( ref.current )
            observer.observe( ref.current )
        return () => {
            if ( ref.current )
                observer.unobserve( ref.current )
            observer.disconnect()
        }
    } )

    return size
}

export function useIsLandscape( ref: React.MutableRefObject<Element | null> ) {
    const [ landscape, setLandscape ] = useState<boolean>()

    const observer = new ResizeObserver( () => {
        const element = ref.current
        if ( !element ) return
        const rect = element.getBoundingClientRect()
        const _landscape = rect.width > rect.height
        if ( _landscape !== landscape )
            setLandscape( _landscape )
    } )

    useEffect( () => {
        if ( ref.current )
            observer.observe( ref.current )
        return () => {
            if ( ref.current )
                observer.unobserve( ref.current )
            observer.disconnect()
        }
    } )

    return landscape
}
