import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // 部署相关的配置
  base:
    process.env.NODE_ENV === "production"
      ? "/Front-end/" // 改成你的 GitHub 仓库名
      : "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
