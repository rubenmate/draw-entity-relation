export default function getStyleByKey(style, key) {
    const obj = {};
    const stylesArr = style.split(";").filter(Boolean); // Filter out empty strings

    for (const v of stylesArr) {
        const keyValueArray = v.split("=");
        if (keyValueArray.length === 2) {
            const keyPart = keyValueArray[0].trim();
            const value = keyValueArray[1]?.trim() || ""; // Safely trim and provide a fallback value
            obj[keyPart] = value;
        } else {
            console.warn(`Unexpected format in style string "${v}"`);
        }
    }

    return obj[key];
}
