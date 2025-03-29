/**
 * Utility functions for common data conversions (Blob, Base64, ArrayBuffer).
 */

/**
 * Converts a Blob object containing JSON text data into a parsed JavaScript object.
 * @param {Blob} blob - The Blob object to parse. Must contain valid JSON text.
 * @returns {Promise<Object>} A Promise that resolves with the parsed JSON object or rejects with an Error.
 */
export function blobToJSON(blob) {
    return new Promise((resolve, reject) => {
        // 1. Validate Input
        if (!(blob instanceof Blob)) {
            console.error("blobToJSON Error: Input is not a Blob object.", blob);
            return reject(new Error("Invalid input: Expected a Blob object."));
        }
        // Optional: Check MIME type if known?
        // if (blob.type && !blob.type.includes('json')) {
        //     console.warn(`blobToJSON Warning: Blob type is "${blob.type}", expected JSON.`);
        // }

        // 2. Use FileReader to read Blob content as text
        const reader = new FileReader();

        reader.onload = () => {
            // 3. Parse the text result as JSON
            try {
                if (typeof reader.result === 'string') {
                    const jsonObject = JSON.parse(reader.result);
                    resolve(jsonObject); // Resolve promise with the parsed object
                } else {
                    // Should not happen if readAsText was successful, but handle defensively
                    console.error("blobToJSON Error: FileReader result was not a string.");
                    reject(new Error("Failed to read Blob content as text."));
                }
            } catch (parseError) {
                console.error("blobToJSON Error: Failed to parse Blob content as JSON:", parseError);
                reject(new Error(`JSON parsing error: ${parseError.message}`)); // Reject with specific error
            }
        };

        // Handle potential errors during file reading
        reader.onerror = (event) => {
            console.error("blobToJSON Error: FileReader failed to read Blob:", event.target.error);
            reject(new Error(`FileReader error: ${event.target.error?.message || 'Unknown read error'}`));
        };

        reader.onabort = () => {
            console.warn("blobToJSON: Blob reading was aborted.");
            reject(new Error("Blob reading aborted."));
        };

        // Start reading the Blob as text
        try {
            reader.readAsText(blob);
        } catch (readError) {
            console.error("blobToJSON Error: Failed to initiate Blob reading:", readError);
            reject(new Error(`Failed to read Blob: ${readError.message}`));
        }
    });
}

/**
 * Converts a base64 encoded string to an ArrayBuffer.
 * Assumes standard base64 encoding.
 * @param {string} base64 - The base64 encoded string.
 * @returns {ArrayBuffer} An ArrayBuffer containing the decoded binary data.
 * @throws {Error} If the input is not a string or if base64 decoding fails.
 */
export function base64ToArrayBuffer(base64) {
    // 1. Validate Input
    if (typeof base64 !== 'string') {
        console.error("base64ToArrayBuffer Error: Input is not a string.", base64);
        throw new Error("Invalid input: Expected a base64 string.");
    }
    // Optional: Basic check for base64 format? Can be complex/slow.
    // A simple check might be: /^[A-Za-z0-9+/]*={0,2}$/.test(base64) && base64.length % 4 === 0

    let binaryString;
    try {
        // 2. Decode base64 string to a binary string using atob()
        binaryString = atob(base64);
    } catch (error) {
        // atob throws a DOMException if the string is not correctly encoded
        console.error("base64ToArrayBuffer Error: Failed to decode base64 string (invalid encoding?):", error);
        throw new Error(`Invalid base64 string: ${error.message}`);
    }

    // 3. Convert binary string to byte array (Uint8Array)
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        // Get character code (byte value) for each character in the binary string
        bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Return the ArrayBuffer underlying the Uint8Array
    return bytes.buffer;
}

/**
 * Converts an ArrayBuffer (or TypedArray view like Uint8Array) to a base64 encoded string.
 * Note: Standard btoa() can have issues with Unicode strings if the buffer represents text.
 * This function works correctly for arbitrary binary data.
 * @param {ArrayBuffer|TypedArray} buffer - The ArrayBuffer or TypedArray view to convert.
 * @returns {string} The base64 encoded string representation of the buffer data.
 * @throws {Error} If the input is not an ArrayBuffer/TypedArray or if encoding fails.
 */
export function arrayBufferToBase64(buffer) {
    // 1. Validate Input and Get Uint8Array View
    let bytes;
    if (buffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(buffer);
    } else if (ArrayBuffer.isView(buffer) && buffer.BYTES_PER_ELEMENT) {
        // Handle TypedArrays like Uint8Array directly
        bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
        console.error("arrayBufferToBase64 Error: Input must be an ArrayBuffer or TypedArray.", buffer);
        throw new Error("Invalid input: Expected ArrayBuffer or TypedArray.");
    }

    // 2. Convert byte array to binary string
    let binary = '';
    const len = bytes.byteLength;
    try {
        // Optimization: Process in chunks to avoid potential 'Maximum call stack size exceeded' errors for very large buffers
        const chunkSize = 8192; // Process 8KB at a time
        for (let i = 0; i < len; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
            // Apply String.fromCharCode to each byte in the chunk
            binary += String.fromCharCode.apply(null, chunk);
        }

        // // Original simpler (but potentially less safe for large buffers) version:
        // for (let i = 0; i < len; i++) {
        //     binary += String.fromCharCode(bytes[i]);
        // }
    } catch (charError) {
        console.error("arrayBufferToBase64 Error: Failed converting bytes to binary string:", charError);
        throw new Error(`Byte conversion error: ${charError.message}`);
    }


    // 3. Encode binary string to base64 using btoa()
    try {
        return btoa(binary);
    } catch (error) {
        // btoa can throw if the binary string contains characters outside the Latin1 range
        // (shouldn't happen here as we build from bytes 0-255, but catch defensively)
        console.error('arrayBufferToBase64 Error: Failed to encode binary string to base64:', error);
        throw new Error(`Base64 encoding error: ${error.message}`);
    }
}