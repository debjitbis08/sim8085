export function toByteString(n) {
    if (n == null) return "";

    if (n < 16) return `0${toRadix(16, n)}`;
    else return toRadix(16, n);
}

export function toRadix(r, n) {
    if (n == null || r == null) return "";

    function getChr(c) {
        return c < 10 ? c.toString() : String.fromCharCode(87 + c);
    }

    function getStr(b) {
        return n < b ? getChr(n) : toRadix(r, Math.floor(n / b)) + getChr(n % b);
    }

    if (r >= 2 && r <= 16) {
        return getStr(r).toUpperCase();
    } else {
        return n.toString().toUpperCase();
    }
}
