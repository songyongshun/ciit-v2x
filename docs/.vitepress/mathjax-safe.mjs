// 自定义数学渲染封装：在 markdown-it-mathjax3 基础上增加容错
// 当某个 $...$ / $$...$$ 公式因 PDF 提取残缺而无法被 MathJax 解析时，
// 回退为纯文本显示，避免整站构建失败。
import mathjax3 from 'markdown-it-mathjax3'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'

export default function mathjaxSafePlugin(md, options) {
  const documentOptions = {
    InputJax: new TeX(
      Object.assign({ packages: AllPackages }, options?.tex)
    ),
    OutputJax: new SVG(
      Object.assign({ fontCache: 'none' }, options?.svg)
    ),
  }

  // 先使用原插件注册规则
  md.use(mathjax3, options)

  // 再覆盖其渲染器，捕获异常并回退为纯文本
  const esc = (s) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const renderMathSafe = (src, display) => {
    try {
      const adaptor = liteAdaptor()
      RegisterHTMLHandler(adaptor)
      const mathDocument = mathjax.document(src, documentOptions)
      const html = adaptor.outerHTML(
        mathDocument.convert(src, { display })
      )
      return html || ''
    } catch (e) {
      // MathJax 无法解析，回退为内联代码
      const marker = display ? '$$' : '$'
      return `<code class="language-text">${esc(marker + src + marker)}</code>`
    }
  }

  md.renderer.rules.math_inline = (tokens, idx) => renderMathSafe(tokens[idx].content, false)
  md.renderer.rules.math_block = (tokens, idx) => renderMathSafe(tokens[idx].content, true)
}