/**
 * 背景图片墙（Background Wall）—— Host 半区（静态安装版）
 *
 * 作为普通 Cordis 插件加载（在 cordis 组合中占用一行），提供：
 *   GET /bgwall/load?path=<路径>  ->  JSON { ok, url }（注册/刷新图片路由）
 *   GET /bgwall/img-<n>.<ext>     ->  图片字节（供浏览器同源加载）
 *
 * 相对路径基于工作区根目录解析；绝对路径原样使用（由 fs 服务自身的
 * 沙箱策略约束）。图片上限 15MB。
 */
export default {
  name: 'bgwall',

  apply(ctx) {
    const fs = ctx.get('fs')
    const webServer = ctx.get('webServer')
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const workspaceRoot = (sandboxPolicy && sandboxPolicy.workspaceRoot)
      ? String(sandboxPolicy.workspaceRoot)
      : null

    const MIME = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
      ico: 'image/x-icon', tif: 'image/tiff', tiff: 'image/tiff',
    }

    function extOf(path) {
      const m = /\.([a-zA-Z0-9]+)$/.exec(String(path))
      return m ? m[1].toLowerCase() : 'bin'
    }

    function mimeFor(path) {
      return MIME[extOf(path)] || 'image/png'
    }

    if (!webServer) return

    let routeDisposer = null
    let routeCounter = 0

    const loadDisposer = webServer.register({
      kind: 'exact',
      path: '/bgwall/load',
      handler: async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const input = String(url.searchParams.get('path') || '').trim()

        const respond = (obj) => {
          const body = JSON.stringify(obj)
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(body),
          })
          res.end(body)
        }

        if (!input) return respond({ ok: false, error: '路径为空' })
        if (!fs) return respond({ ok: false, error: '文件系统服务不可用' })

        try {
          let resolved = input
          if (!resolved.startsWith('/')) {
            if (!workspaceRoot) {
              return respond({ ok: false, error: '相对路径无法解析，请使用绝对路径（如 /root/deepseek_demo/dog.jpg）' })
            }
            resolved = workspaceRoot.replace(/\/+$/, '') + '/' + resolved
          }

          const target = await fs.resolve(resolved)
          const bytes = await fs.readBytes(target, undefined, 15 * 1024 * 1024)
          const mime = mimeFor(input)

          if (routeDisposer) { routeDisposer(); routeDisposer = null }
          routeCounter += 1
          const routePath = '/bgwall/img-' + routeCounter + '.' + extOf(input)
          const payload = bytes
          const contentType = mime
          routeDisposer = webServer.register({
            kind: 'exact',
            path: routePath,
            handler: (_req, res2) => {
              res2.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': payload.length,
                'Cache-Control': 'no-store',
              })
              res2.end(payload)
            },
          })
          return respond({ ok: true, url: routePath })
        } catch (e) {
          const msg = (e && e.message) ? String(e.message) : String(e)
          return respond({ ok: false, error: msg })
        }
      },
    })

    ctx.on('dispose', () => {
      loadDisposer()
      if (routeDisposer) { routeDisposer(); routeDisposer = null }
    })
  },
}
