/**
 * 背景图片墙（Background Wall）—— Client 半区（静态安装版）
 *
 * 以 dsh.web 客户端插件模块格式打包（window.__ModuleLoader__.load），
 * 由 client-modules 扫描 package.json 的 dsh.client 声明后挂载。
 *
 * 与动态版的三处差异：
 *   1. React 通过 require('react') 获取（静态模块是普通浏览器代码）
 *   2. 本地图片经 fetch('/bgwall/load?path=…') 走 Host 的 HTTP 接口
 *   3. CSS 直接管理 document.head 中的 <style> 标签
 *
 * 界面与动态版一致：背景应用常驻（shell.overlay 隐形组件），
 * 控制面板位于「设置 → 背景图片」。
 */
window.__ModuleLoader__.load({
  id: 'dsh-bgwall-plugin',
  factory: (require) => {
    const React = require('react')

    function escapeCssUrl(value) {
      return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    }

    function buildBgCss(image, opacity, blur, fit, baseBg) {
      const img = (image === null || image === undefined || image === '')
        ? 'none'
        : 'url("' + escapeCssUrl(image) + '")'
      const parts = []
      parts.push('--bgwall-image:' + img)
      parts.push('--bgwall-opacity:' + Math.max(0, Math.min(1, opacity / 100)).toFixed(3))
      parts.push('--bgwall-blur:' + Math.max(0, Math.min(40, blur)).toFixed(1) + 'px')
      parts.push('--bgwall-fit:' + fit)
      let css = ':root{' + parts.join(';') + '}'
      if (baseBg) css += 'body::before{background-color:' + baseBg + '}'
      return css
    }

    function BgKeeper(props) {
      const [rev, setRev] = React.useState(0)
      React.useEffect(() => props.subscribe(() => setRev((r) => r + 1)), [props])
      const [baseBg, setBaseBg] = React.useState(() => {
        try { return props.captureBaseBg() || null } catch (e) { return null }
      })
      const s = props.getState()
      React.useEffect(() => {
        props.updateBgCss(buildBgCss(s.image, s.opacity, s.blur, s.fit, baseBg))
      }, [s.image, s.opacity, s.blur, s.fit, baseBg, rev, props])
      React.useEffect(() => {
        props.syncThemeOverride(s.image !== null, s.sidebar)
      }, [s.image, s.sidebar, rev, props])
      return null
    }

    function BgSettingsPage(props) {
      const [rev, setRev] = React.useState(0)
      React.useEffect(() => props.subscribe(() => setRev((r) => r + 1)), [props])
      const s = props.getState()

      const [urlText, setUrlText] = React.useState('')
      const [pathText, setPathText] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)

      const FONT = 'inherit'
      const inputStyle = {
        flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)', fontSize: 12, fontFamily: FONT,
      }
      const btnStyle = {
        padding: '6px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer', fontSize: 12, fontFamily: FONT, whiteSpace: 'nowrap',
      }
      const sectionStyle = {
        fontWeight: 600, fontSize: 12, color: 'var(--dsw-alias-label-secondary)',
        margin: '16px 0 6px',
      }
      const rowStyle = { display: 'flex', alignItems: 'center', gap: 6 }

      const applyUrl = () => {
        const v = urlText.trim()
        if (!v) return
        props.setState({ image: v })
        setError(null)
      }

      const loadLocal = async () => {
        const p = pathText.trim()
        if (!p) return
        setBusy(true)
        setError(null)
        try {
          const res = await fetch('/bgwall/load?path=' + encodeURIComponent(p)).then((r) => r.json())
          if (res && res.ok && res.url) {
            props.setState({ image: res.url })
          } else {
            setError((res && res.error) ? String(res.error) : '加载失败')
          }
        } catch (e) {
          setError((e && e.message) ? String(e.message) : String(e))
        } finally {
          setBusy(false)
        }
      }

      const clearBg = () => {
        props.setState({ image: null })
        setUrlText('')
        setPathText('')
        setError(null)
      }

      return React.createElement('div', {
        style: { width: '100%', maxWidth: 560, boxSizing: 'border-box' },
      }, [
        React.createElement('div', { key: 'title', style: { fontWeight: 700, fontSize: 16 } }, '背景图片'),
        React.createElement('div', { key: 'sub', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginTop: 4 } },
          '把界面背景换成任意图片，支持透明度、模糊与铺放方式调节。'),
        s.image ? React.createElement('div', {
          key: 'status',
          style: { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-success-primary)', wordBreak: 'break-all' },
        }, '已应用：' + s.image.slice(0, 60) + (s.image.length > 60 ? '…' : '')) : null,

        React.createElement('div', { key: 'src-title', style: sectionStyle }, '图片来源'),
        React.createElement('div', { key: 'url-row', style: rowStyle }, [
          React.createElement('input', {
            key: 'url', value: urlText, placeholder: '图片 URL（https://…）',
            onChange: (e) => setUrlText(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') applyUrl() },
            style: inputStyle,
          }),
          React.createElement('button', { key: 'url-btn', onClick: applyUrl, style: btnStyle }, '应用'),
        ]),
        React.createElement('div', { key: 'path-row', style: Object.assign({ marginTop: 6 }, rowStyle) }, [
          React.createElement('input', {
            key: 'path', value: pathText, placeholder: '服务器本地路径（如 dog.jpg 或 /root/pic.png）',
            onChange: (e) => setPathText(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') loadLocal() },
            style: inputStyle,
          }),
          React.createElement('button', {
            key: 'path-btn', onClick: loadLocal, disabled: busy, style: btnStyle,
          }, busy ? '读取中…' : '加载'),
        ]),

        React.createElement('div', { key: 'opacity-title', style: sectionStyle }, '透明度'),
        React.createElement('div', { key: 'opacity-row', style: rowStyle }, [
          React.createElement('input', {
            key: 'slider', type: 'range', min: 0, max: 100, value: s.opacity,
            onChange: (e) => props.setState({ opacity: Number(e.target.value) }), style: { flex: 1 },
          }),
          React.createElement('span', { key: 'val', style: { width: 44, textAlign: 'right', fontSize: 12 } },
            Math.round(s.opacity) + '%'),
        ]),

        React.createElement('div', { key: 'blur-title', style: sectionStyle }, '模糊'),
        React.createElement('div', { key: 'blur-row', style: rowStyle }, [
          React.createElement('input', {
            key: 'slider', type: 'range', min: 0, max: 40, value: s.blur,
            onChange: (e) => props.setState({ blur: Number(e.target.value) }), style: { flex: 1 },
          }),
          React.createElement('span', { key: 'val', style: { width: 44, textAlign: 'right', fontSize: 12 } },
            Math.round(s.blur) + 'px'),
        ]),

        React.createElement('div', { key: 'fit-title', style: sectionStyle }, '铺放方式'),
        React.createElement('select', {
          key: 'fit-select', value: s.fit, onChange: (e) => props.setState({ fit: e.target.value }),
          style: Object.assign({ width: '100%' }, inputStyle),
        }, [
          React.createElement('option', { key: 'cover', value: 'cover' }, '铺满（cover）'),
          React.createElement('option', { key: 'contain', value: 'contain' }, '适应（contain）'),
          React.createElement('option', { key: 'stretch', value: '100% 100%' }, '拉伸铺满'),
        ]),

        React.createElement('label', { key: 'sidebar', style: Object.assign({ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }, rowStyle) }, [
          React.createElement('input', {
            type: 'checkbox', checked: s.sidebar,
            onChange: (e) => props.setState({ sidebar: e.target.checked }),
          }),
          ' 侧边栏背景也透明',
        ]),

        error ? React.createElement('div', {
          key: 'error',
          style: {
            marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)',
            wordBreak: 'break-all',
          },
        }, String(error)) : null,

        React.createElement('div', { key: 'foot', style: Object.assign({ marginTop: 20 }, rowStyle) }, [
          React.createElement('button', {
            onClick: clearBg, style: Object.assign({}, btnStyle, {
              border: '1px solid var(--dsw-alias-state-error-primary)',
              color: 'var(--dsw-alias-state-error-primary)', background: 'transparent',
            }),
          }, '清除背景'),
        ]),
      ])
    }

    return {
      name: 'bgwall',
      apply(ctx) {
        const theme = ctx.get('theme')
        const slots = ctx.get('slots')
        if (slots === undefined) return

        const baseTag = document.createElement('style')
        baseTag.textContent = [
          ':root{--bgwall-image:none;--bgwall-opacity:1;--bgwall-blur:0px;--bgwall-fit:cover;}',
          'body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;',
          'background-image:var(--bgwall-image);background-size:var(--bgwall-fit);',
          'background-position:center;background-repeat:no-repeat;opacity:var(--bgwall-opacity);',
          'filter:blur(var(--bgwall-blur));transition:opacity .15s ease;}',
        ].join('\n')
        document.head.append(baseTag)

        let bgTag = null
        function updateBgCss(css) {
          if (!bgTag) { bgTag = document.createElement('style'); document.head.append(bgTag) }
          bgTag.textContent = css
        }

        let overrideDisposer = null
        function syncThemeOverride(active, sidebarTransparent) {
          if (overrideDisposer) { overrideDisposer(); overrideDisposer = null }
          if (!active) return
          if (!theme) return
          const tokens = {
            '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
          }
          if (sidebarTransparent) {
            tokens['--dsw-specific-sidebar-fill'] = { light: 'transparent', dark: 'transparent' }
          }
          try {
            overrideDisposer = theme.overrideTokens('bgwall', tokens)
          } catch (e) {
            console.error(e)
          }
        }

        function captureBaseBg() {
          if (!theme || !theme.getTheme) return null
          try {
            const snap = theme.getTheme()
            const tokens = snap && snap.active && snap.active.tokens
            if (!tokens) return null
            const v = tokens['--dsw-alias-bg-base']
            return (typeof v === 'string' && v) ? v : null
          } catch (e) {
            return null
          }
        }

        const store = {
          image: null,
          opacity: 100,
          blur: 0,
          fit: 'cover',
          sidebar: false,
          rev: 0,
        }
        const listeners = new Set()
        function getState() { return store }
        function setState(patch) {
          Object.assign(store, patch)
          store.rev += 1
          for (const fn of [...listeners]) fn()
        }
        function subscribe(fn) {
          listeners.add(fn)
          return () => { listeners.delete(fn) }
        }

        ctx.on('dispose', () => {
          if (bgTag) { bgTag.remove(); bgTag = null }
          baseTag.remove()
          if (overrideDisposer) { overrideDisposer(); overrideDisposer = null }
        })

        slots.inject('shell.overlay', () => slots.register(
          { name: 'shell.overlay', id: 'bgwall-keeper' },
          () => React.createElement(BgKeeper, { getState, subscribe, updateBgCss, syncThemeOverride, captureBaseBg }),
        ))

        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'bgwall', order: 6, label: '背景图片' },
          (props) => React.createElement(BgSettingsPage, { getState, setState, subscribe }),
        ))
      },
    }
  },
})
