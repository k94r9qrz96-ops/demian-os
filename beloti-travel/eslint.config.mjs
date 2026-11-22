import next from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
  ...next,
  ...coreWebVitals,
  ...ts,
  { ignores: [".next/**", "out/**", "node_modules/**", "public/**", "media-src/**", "next-env.d.ts"] },
];
export default config;
