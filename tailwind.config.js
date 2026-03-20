/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                whi: {
                    DEFAULT: '#F17E00',
                    hover: '#ea7b00',
                    purple: {
                        DEFAULT: '#210747',
                        subtle: 'rgba(181, 141, 182, 0.1)',
                    },
                    sidebar: {
                        bg: '#210747',
                        border: 'rgba(181, 141, 182, 0.2)',
                        text: 'rgba(255, 255, 255, 0.85)',
                    }
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
