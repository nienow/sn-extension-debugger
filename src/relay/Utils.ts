declare global {
    interface Window {
        msCrypto: unknown
    }
}

export const generateUuid = (): string => {
    return crypto.randomUUID();
}

export const isValidJsonString = (str: unknown): boolean => {
    if (typeof str !== 'string') {
        return false
    }
    try {
        const result = JSON.parse(str)
        const type = Object.prototype.toString.call(result)
        return type === '[object Object]' || type === '[object Array]'
    } catch (e) {
        return false
    }
}
