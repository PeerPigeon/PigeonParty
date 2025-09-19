import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Vue Router 自动路由
    VueRouter({
      routesFolder: 'src/pages',
      dts: 'src/typed-router.d.ts',
      exclude: ['**/components/**'],
    }),

    // Vue 插件
    vue(),
    // Vue 开发工具
    vueDevTools(),

    // 页面自动路由已由 unplugin-vue-router 处理

    // 自动导入 API
    AutoImport({
      imports: [
        'vue',
        'pinia',
        '@vueuse/core',
        VueRouterAutoImports,
        {
          // 自定义导入
          'vue-router/auto': ['useRoute', 'useRouter'],
        },
      ],
      dts: 'src/auto-imports.d.ts',
      dirs: [
        'src/composables',
        'src/stores',
        'src/utils',
      ],
      vueTemplate: true,
    }),

    // 自动导入组件
    Components({
      dirs: [
        'src/components',
      ],
      dts: 'src/components.d.ts',
      resolvers: [
        // Inspira UI 组件解析器
        (componentName) => {
          if (componentName.startsWith('Base')) {
            return {
              name: componentName,
              from: '@/components/ui',
            }
          }
        },
   
        (componentName) => {
          if (componentName.endsWith('Icon')) {
            return {
              name: componentName,
              from: '@heroicons/vue/24/outline',
            }
          }
        },
      ],
    }),


    ...(process.env.NODE_ENV === 'production' ? [
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
             {
               urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*$/i,
               handler: 'CacheFirst',
               options: {
                 cacheName: 'google-fonts-cache',
                 expiration: {
                   maxEntries: 10,
                   maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                 }
               }
             },
             {
               urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*$/i,
               handler: 'CacheFirst',
               options: {
                 cacheName: 'gstatic-fonts-cache',
                 expiration: {
                   maxEntries: 10,
                   maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                 }
               }
             }
           ]
        },
        manifest: {
          name: 'PONZS',
          short_name: 'PONZS',
          description: 'Personal portfolio and blog',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ] : []),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 使用源码入口，以便以 ESM 方式导入 PeerPigeonMesh
      'peerpigeon': fileURLToPath(new URL('../peerpigeon/src/browser-entry.js', import.meta.url)),
      // 允许在前端直接导入本仓库内的 hashkeys 源码（直接指向入口文件）
      'hashkeys': fileURLToPath(new URL('../hashkeys/src/useAuth.js', import.meta.url)),
      // 将 node-webrtc 指向浏览器端桩模块
      'node-webrtc': fileURLToPath(new URL('./src/shims/node-webrtc.js', import.meta.url)),
    },
  },

  optimizeDeps: {
    // 避免预构建本地源码别名，直接按源码加载
    exclude: [
      'peerpigeon',
      'hashkeys',
      // noble 系列库由 hashkeys 的 worker 中使用，避免在浏览器主包中误预构建导致打包冲突
      '@noble/hashes',
      '@noble/curves',
      '@noble/ciphers',
      '@scure/base'
    ]
  },

  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    host: true,
    fs: {
      // 允许访问工作区外部依赖源码
      allow: [
        fileURLToPath(new URL('..', import.meta.url)),
        fileURLToPath(new URL('../hashkeys', import.meta.url)),
        fileURLToPath(new URL('../peerpigeon', import.meta.url)),
      ],
    },
    proxy: {
      '/ice': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8765',
        ws: true,
        changeOrigin: true,
      },
      // 将 /ws 代理到我们在根目录启动的 PeerPigeon signaling server（默认3000）
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: {
          // 将 Vue 相关库分离
          vue: ['vue', 'vue-router'],
        },
        // 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash].[ext]'
          }
          if (ext === 'css') {
            return 'assets/css/[name]-[hash].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        },
      },
    },
    // 启用 gzip 压缩
    reportCompressedSize: true,
    // 设置 chunk 大小警告限制
    chunkSizeWarningLimit: 10000,
  },

  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },




})
