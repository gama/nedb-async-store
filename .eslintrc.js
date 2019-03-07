module.exports = {
    "env": {
        "amd":   true,
        "es6":   true,
        "node":  true,
        "mocha": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "parserOptions": {
        "ecmaFeatures": {},
        "ecmaVersion":  2018,
        "sourceType":   "module"
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "never"
        ],
        "no-console": "off",
    }
}
