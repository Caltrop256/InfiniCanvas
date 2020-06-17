class Color {
    constructor(hex) {
        this.hex = ~~hex;
        this.hexString = '#' + this.hex.toString(16).padStart(6, '0');
        this.r = (hex >> 0x10) & 0xFF;
        this.g = (hex >> 0x8) & 0xFF;
        this.b = hex & 0xFF;
    }
}

if (typeof module != 'undefined') module.exports = Color;