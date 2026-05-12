const DEFAULT_TIMEOUT_MS = 5000;

export const LandscapeDataURL = new URL("../L_DATA.json", import.meta.url).href;
export const PortraitDataURL = new URL("../P_DATA.json", import.meta.url).href;

async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function loadDataSafely(primaryUrl, fallbackUrl, fallbackData) {
    const urls = [primaryUrl, fallbackUrl].filter(Boolean);

    for (const url of urls) {
        try {
            return await fetchJson(url);
        } catch (error) {
            console.warn(error);
        }
    }

    return fallbackData;
}
