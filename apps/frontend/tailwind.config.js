/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090B", // Zinc 950
                surface: "#18181B",    // Zinc 900
                primary: "#6366F1",    // Indigo 500
                success: "#10B981",    // Emerald 500
                textMain: "#F8FAFC",   // Slate 50
                textMuted: "#A1A1AA",  // Zinc 400
            },
        },
    },
    plugins: [],
}
