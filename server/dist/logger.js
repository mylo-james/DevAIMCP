export const logger = {
    info: (message, meta) => {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error: (message, meta) => {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message, meta) => {
        if (process.env.DEBUG) {
            console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    },
};
