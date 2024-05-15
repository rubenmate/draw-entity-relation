export default function getStyleByKey(style, key) {
    const obj = {};
    const stylesArr = style.split(";");
    stylesArr.forEach((v) => {
        const [key, value] = v.split("=");
        obj[key] = value;
    });

    return obj[key];
}
