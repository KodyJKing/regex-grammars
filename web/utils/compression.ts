export async function compressString( str: string ) {
    const blob = new Blob( [ str ] )
    const encodedResponse = new Response( blob.stream().pipeThrough( new CompressionStream( 'gzip' ) ) )
    return await encodedResponse.text()
}

export async function decompressString( str: string ) {
    const blob = new Blob( [ str ] )
    const decodedResponse = new Response( blob.stream().pipeThrough( new DecompressionStream( 'gzip' ) ) )
    return await decodedResponse.text()
}