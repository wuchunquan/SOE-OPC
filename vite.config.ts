import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import vueDevTools from 'vite-plugin-vue-devtools'
import viteCompression from 'vite-plugin-compression'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import ElementPlus from 'unplugin-element-plus/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const { VITE_VERSION, VITE_PORT, VITE_BASE_URL, VITE_API_URL, VITE_API_PROXY_URL } = env

  console.log(`🚀 API_URL = ${VITE_API_URL}`)
  console.log(`🚀 VERSION = ${VITE_VERSION}`)

  return defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(VITE_VERSION)
    },
    base: VITE_BASE_URL,
    server: {
      port: Number(VITE_PORT),
      proxy: {
        '/api': {
          target: VITE_API_PROXY_URL,
          changeOrigin: true,
          ws: true  // 启用 WebSocket 代理
        },
         '/u': {
          target: VITE_API_PROXY_URL,
          changeOrigin: true,
          ws: true  // 启用 WebSocket 代理
        },
        '/static': {
          target: VITE_API_PROXY_URL,
          changeOrigin: true
        }
      },
      host: true
    },
    // 路径别名
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': resolvePath('src/views'),
        '@imgs': resolvePath('src/assets/images'),
        '@icons': resolvePath('src/assets/icons'),
        '@utils': resolvePath('src/utils'),
        '@stores': resolvePath('src/store'),
        '@styles': resolvePath('src/assets/styles'),
        '@tauri-apps/plugin-http': resolvePath('src/desktop/tauri-compat/plugin-http.ts'),
        '@tauri-apps/plugin-dialog': resolvePath('src/desktop/tauri-compat/plugin-dialog.ts'),
        '@tauri-apps/plugin-fs': resolvePath('src/desktop/tauri-compat/plugin-fs.ts'),
        '@tauri-apps/plugin-shell': resolvePath('src/desktop/tauri-compat/plugin-shell.ts'),
        '@tauri-apps/plugin-clipboard-manager': resolvePath('src/desktop/tauri-compat/plugin-clipboard-manager.ts'),
        '@tauri-apps/plugin-notification': resolvePath('src/desktop/tauri-compat/plugin-notification.ts'),
        '@tauri-apps/api/core': resolvePath('src/desktop/tauri-compat/api-core.ts'),
        '@tauri-apps/api/event': resolvePath('src/desktop/tauri-compat/api-event.ts'),
        '@tauri-apps/api/window': resolvePath('src/desktop/tauri-compat/api-window.ts'),
        '@tauri-apps/api/webviewWindow': resolvePath('src/desktop/tauri-compat/api-webviewWindow.ts'),
        // // 将 @codemirror/language-data 映射到自定义模块，只包含需要的语言
        // '@codemirror/language-data': resolvePath('src/utils/language-data.ts'),
        // // 将不需要的 @codemirror/lang 语言包映射到空模块，减少打包体积
        // '@codemirror/lang-php': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-java': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-cpp': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-rust': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-xml': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-yaml': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-sql': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-go': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-ruby': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-swift': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-kotlin': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-scala': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-perl': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-r': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-lua': resolvePath('src/utils/empty.ts'),
        // '@codemirror/lang-dart': resolvePath('src/utils/empty.ts')
      }
    },
    build: {
      target: 'es2015',
      outDir: 'pysrc/static/dist',
      //打包前删除旧文件
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
      terserOptions: {
        compress: {
          // 生产环境去除 console
          drop_console: true,
          // 生产环境去除 debugger
          drop_debugger: true
        }
      },
      dynamicImportVarsOptions: {
        warnOnError: true,
        exclude: [],
        include: ['src/views/**/*.vue']
      // },
      // rollupOptions: {
      //   output: {
      //     manualChunks: {
      //       // 将 CodeMirror 相关的包单独打包
      //       'codemirror': [
      //         '@codemirror/state',
      //         '@codemirror/view',
      //         '@codemirror/commands',
      //         '@codemirror/search',
      //         '@codemirror/theme-one-dark'
      //       ],
      //       // 只打包实际使用的语言
      //       'codemirror-langs': [
      //         '@codemirror/lang-html',
      //         '@codemirror/lang-javascript',
      //         '@codemirror/lang-python',
      //         '@codemirror/lang-json',
      //         '@codemirror/lang-css',
      //         '@codemirror/lang-markdown'
      //       ]
      //     }
      //   }
      }
    },
    plugins: [
      vue(),
      tailwindcss(),
      // 自动按需导入 API
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        dts: 'src/types/import/auto-imports.d.ts',
        resolvers: [ElementPlusResolver()],
        eslintrc: {
          enabled: true,
          filepath: './.auto-import.json',
          globalsPropValue: true
        }
      }),
      // 自动按需导入组件
      Components({
        dts: 'src/types/import/components.d.ts',
        resolvers: [ElementPlusResolver()]
      }),
      // 按需定制主题配置
      ElementPlus({
        useSource: true
      }),
      // 压缩
      // viteCompression({
      //   verbose: false, // 是否在控制台输出压缩结果
      //   disable: false, // 是否禁用
      //   algorithm: 'gzip', // 压缩算法
      //   ext: '.gz', // 压缩后的文件名后缀
      //   threshold: 10240, // 只有大小大于该值的资源会被处理 10240B = 10KB
      //   deleteOriginFile: false // 压缩后是否删除原文件
      // }),
      // vueDevTools()
      // 打包分析
      // visualizer({
      //   open: true,
      //   gzipSize: true,
      //   brotliSize: true,
      //   filename: 'dist/stats.html' // 分析图生成的文件名及路径
      // }),
    ],
    // 依赖预构建：避免运行时重复请求与转换，提升首次加载速度
    optimizeDeps: {
      include: [
        'echarts/core',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        'xlsx',
        'xgplayer',
        'file-saver',
        'vue-img-cutter',
        'element-plus/es',
        'element-plus/es/components/*/style/css',
        'element-plus/es/components/*/style/index'
      ]
    },
    css: {
      preprocessorOptions: {
        // sass variable and mixin
        scss: {
          additionalData: `
            @use "@styles/core/el-light.scss" as *; 
            @use "@styles/core/mixin.scss" as *;
          `
        }
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove()
                }
              }
            }
          }
        ]
      }
    }
  })
}

function resolvePath(paths: string) {
  return path.resolve(__dirname, paths)
}
