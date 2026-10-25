import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// 检查 src/_locales 下的翻译文件：
// - vue-i18n 对“存在的空字符串”不会回退到 fallbackLocale，会直接渲染空白，因此空翻译必须失败。
// - 缺失键会正常回退到 en；只有基准语言（en）缺键才是错误，其他语言缺键默认只告警。
// - 脚本只解析项目使用的 YAML 子集；遇到无法识别的语法直接失败，避免静默漏检。
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEFAULT_LOCALE_DIR = join(repoRoot, 'src', '_locales')
const LOCALE_FILE_PATTERN = /\.ya?ml$/i
const REFERENCE_FILE_PATTERN = /^en\.ya?ml$/i
const KEY_LINE_PATTERN = /^(?<indent> *)(?<name>[\w-]+):(?:$|[ \t](?<value>.*)$)/
const BLOCK_SCALAR_HEADER_PATTERN = /^[|>](?:[+-][1-9]?|[1-9][+-]?)?\s*(?:#.*)?$/
const COMMENT_SEPARATOR_PATTERN = /[ \t]#/
const MAX_LISTED_KEYS = 10
const TITLE = '翻译文件检查'

const USAGE = `用法：node .github/scripts/locale-check.mjs [翻译目录] [--strict-parity]

默认检查 src/_locales；--strict-parity 会把非基准语言的缺失键也视为错误。`

function escapeCommandValue(value) {
  return value
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
}

function emitAnnotation(level, message, file, line) {
  const attributes = []
  if (file)
    attributes.push(`file=${escapeCommandValue(file)}`)
  if (line)
    attributes.push(`line=${line}`)
  attributes.push(`title=${TITLE}`)

  const annotation = `::${level} ${attributes.join(',')}::${escapeCommandValue(message)}`
  if (level === 'warning')
    console.warn(annotation)
  else
    console.error(annotation)
}

function repoRelativePath(filePath) {
  return relative(repoRoot, filePath).split(sep).join('/')
}

function stripComment(raw) {
  if (raw.trimStart().startsWith('#'))
    return ''
  const index = raw.search(COMMENT_SEPARATOR_PATTERN)
  return index === -1 ? raw : raw.slice(0, index)
}

function finishQuotedValue(quote, inner, rest) {
  const trailing = rest.trim()
  if (trailing !== '' && !trailing.startsWith('#'))
    return { error: true }

  // 双引号里的 \n、\t 等转义渲染后也是空白；单引号里的反斜杠只是普通字符。
  const normalized = quote === '"' ? inner.replace(/\\([nrt ])/g, ' ') : inner
  return { isEmpty: normalized.trim() === '' }
}

function readQuotedValue(raw) {
  const quote = raw[0]
  let inner = ''

  for (let index = 1; index < raw.length; index++) {
    const char = raw[index]

    if (quote === '\'' && char === '\'') {
      if (raw[index + 1] === '\'') {
        inner += '\''
        index++
        continue
      }
      return finishQuotedValue(quote, inner, raw.slice(index + 1))
    }

    if (quote === '"' && char === '\\') {
      inner += char
      if (index + 1 < raw.length) {
        inner += raw[index + 1]
        index++
      }
      continue
    }

    if (char === quote)
      return finishQuotedValue(quote, inner, raw.slice(index + 1))

    inner += char
  }

  return { error: true }
}

function hasUnsupportedValuePrefix(value) {
  return ['[', '{', '&', '*', '!'].some(prefix => value.startsWith(prefix))
}

function parseLocaleFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  const keyLines = new Map()
  const parentPaths = new Set()
  const emptyCandidates = new Map()
  const emptyValues = []
  const syntaxErrors = []
  const stack = []
  let pendingBlockScalar = null

  function finishPendingBlockScalar() {
    if (!pendingBlockScalar)
      return
    if (!pendingBlockScalar.hasContent)
      emptyValues.push({ line: pendingBlockScalar.line, path: pendingBlockScalar.path })
    pendingBlockScalar = null
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const lineNumber = index + 1

    if (pendingBlockScalar) {
      const indent = line.search(/\S/)
      if (line.trim() === '' || indent > pendingBlockScalar.indent) {
        if (line.trim() !== '')
          pendingBlockScalar.hasContent = true
        continue
      }
      finishPendingBlockScalar()
    }

    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#'))
      continue

    const match = KEY_LINE_PATTERN.exec(line)
    if (!match) {
      syntaxErrors.push({ line: lineNumber, message: `无法识别的行：\`${trimmed}\`` })
      continue
    }

    const { indent: indentSpace, name, value: rawValue = '' } = match.groups
    const indent = indentSpace.length
    while (stack.length > 0 && stack.at(-1).indent >= indent)
      stack.pop()

    const parent = stack.at(-1)
    if (parent) {
      parentPaths.add(parent.path)
      if (parent.kind === 'empty-implicit') {
        parent.kind = 'mapping'
        emptyCandidates.delete(parent.path)
      }
      else if (parent.kind === 'empty-explicit') {
        syntaxErrors.push({ line: lineNumber, message: `空字符串键 \`${parent.path}\` 不能包含子键` })
      }
      else if (parent.kind === 'scalar') {
        syntaxErrors.push({ line: lineNumber, message: `标量键 \`${parent.path}\` 不能包含子键` })
      }
    }

    const path = [...stack.map(entry => entry.name), name].join('.')
    if (keyLines.has(path))
      syntaxErrors.push({ line: lineNumber, message: `重复键 \`${path}\`（首次出现在第 ${keyLines.get(path)} 行）` })
    keyLines.set(path, lineNumber)

    const entry = { indent, name, path, kind: 'scalar' }
    stack.push(entry)

    const value = rawValue.trim()
    if (value.startsWith('|') || value.startsWith('>')) {
      if (!BLOCK_SCALAR_HEADER_PATTERN.test(value)) {
        syntaxErrors.push({ line: lineNumber, message: `无法识别的块标量头部：\`${value}\`` })
        continue
      }
      entry.kind = 'block'
      pendingBlockScalar = { indent, line: lineNumber, path, hasContent: false }
      continue
    }

    if (value.startsWith('\'') || value.startsWith('"')) {
      const quoted = readQuotedValue(value)
      if (quoted.error) {
        syntaxErrors.push({ line: lineNumber, message: `无法识别的引号值：\`${value}\`` })
        continue
      }
      if (quoted.isEmpty) {
        entry.kind = 'empty-explicit'
        emptyCandidates.set(path, lineNumber)
      }
      continue
    }

    if (hasUnsupportedValuePrefix(value)) {
      syntaxErrors.push({ line: lineNumber, message: `暂不支持的 YAML 值语法：\`${value}\`` })
      entry.kind = 'unsupported'
      continue
    }

    if (stripComment(value).trim() === '') {
      entry.kind = 'empty-implicit'
      emptyCandidates.set(path, lineNumber)
    }
  }

  finishPendingBlockScalar()
  for (const [path, line] of emptyCandidates)
    emptyValues.push({ line, path })

  const leafPaths = [...keyLines.keys()].filter(path => !parentPaths.has(path))
  if (leafPaths.length === 0)
    syntaxErrors.push({ line: 1, message: '文件中没有任何翻译键' })

  emptyValues.sort((a, b) => a.line - b.line)
  syntaxErrors.sort((a, b) => a.line - b.line)

  return { leafPaths, emptyValues, syntaxErrors }
}

function formatKeyList(keys) {
  const listed = keys.slice(0, MAX_LISTED_KEYS).map(key => `\`${key}\``).join('、')
  return keys.length <= MAX_LISTED_KEYS ? listed : `${listed} 等 ${keys.length} 个`
}

function writeSummary(lines, success) {
  const text = `${lines.join('\n')}\n`
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
    }
    catch (error) {
      console.error(`无法写入 Step Summary：${error.message}`)
    }
  }

  if (success)
    console.log(text.trimEnd())
  else
    console.error(text.trimEnd())
}

function parseCommandLine(argv) {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'strict-parity': { type: 'boolean' },
        'help': { type: 'boolean', short: 'h' },
      },
    })
  }
  catch (error) {
    console.error(`参数错误：${error.message}`)
    process.exitCode = 2
    return null
  }

  if (parsed.values.help) {
    console.log(USAGE)
    return null
  }
  if (parsed.positionals.length > 1) {
    console.error('只接受一个可选的翻译目录参数。')
    process.exitCode = 2
    return null
  }

  return {
    strictParity: parsed.values['strict-parity'] === true,
    localeDir: parsed.positionals[0]
      ? resolve(process.cwd(), parsed.positionals[0])
      : DEFAULT_LOCALE_DIR,
  }
}

function main() {
  const options = parseCommandLine(process.argv.slice(2))
  if (!options)
    return

  let fileNames
  try {
    fileNames = readdirSync(options.localeDir).filter(name => LOCALE_FILE_PATTERN.test(name)).sort()
  }
  catch {
    console.error(`无法读取翻译目录：${options.localeDir}`)
    process.exitCode = 2
    return
  }

  if (fileNames.length === 0) {
    console.error(`翻译目录中没有 .yml 或 .yaml 文件：${options.localeDir}`)
    process.exitCode = 2
    return
  }

  const results = []
  try {
    for (const fileName of fileNames) {
      const filePath = join(options.localeDir, fileName)
      results.push({
        fileName,
        relativePath: repoRelativePath(filePath),
        ...parseLocaleFile(filePath),
      })
    }
  }
  catch (error) {
    console.error(`读取翻译文件失败：${error.message}`)
    process.exitCode = 2
    return
  }

  const reference = results.find(result => REFERENCE_FILE_PATTERN.test(result.fileName)) ?? results[0]
  const referenceKeys = new Set(reference.leafPaths)
  const allKeys = new Set(results.flatMap(result => result.leafPaths))
  const errors = []
  const warnings = []

  for (const result of results) {
    for (const { line, path } of result.emptyValues) {
      errors.push({
        file: result,
        line,
        message: `翻译为空：\`${path}\`（vue-i18n 不会对空字符串回退，会渲染成空白）`,
      })
    }
    for (const { line, message } of result.syntaxErrors)
      errors.push({ file: result, line, message })
  }

  // en 是 fallback 的目标；它缺键时无法再回退，必须失败。
  const missingFromReference = [...allKeys].filter(key => !referenceKeys.has(key)).sort()
  if (missingFromReference.length > 0) {
    errors.push({
      file: reference,
      message: `基准语言 \`${reference.fileName}\` 缺少其他语言已有的 ${missingFromReference.length} 个键：${formatKeyList(missingFromReference)}`,
    })
  }

  const missingByFile = new Map()
  for (const result of results) {
    if (result === reference)
      continue
    const resultKeys = new Set(result.leafPaths)
    const missing = reference.leafPaths.filter(key => !resultKeys.has(key)).sort()
    if (missing.length > 0)
      missingByFile.set(result, missing)
  }

  const parityMessage = missing =>
    `缺少 ${missing.length} 个翻译键（会回退到 ${reference.fileName}）：${formatKeyList(missing)}`

  // 默认把非基准语言的缺失翻译视为警告，保留英文回退；--strict-parity 可强制失败。
  for (const [result, missing] of missingByFile) {
    if (options.strictParity)
      errors.push({ file: result, message: parityMessage(missing) })
    else
      warnings.push({ file: result, message: parityMessage(missing) })
  }

  for (const error of errors)
    emitAnnotation('error', error.message, error.file.relativePath, error.line)
  for (const warning of warnings)
    emitAnnotation('warning', warning.message, warning.file.relativePath)

  const totalKeys = allKeys.size
  const summary = [`## ${TITLE}`, '']

  if (errors.length > 0) {
    summary.push('### ❌ 错误', '')
    for (const error of errors) {
      const location = error.line ? `\`${error.file.fileName}:${error.line}\`` : `\`${error.file.fileName}\``
      summary.push(`- ${location} ${error.message}`)
    }
    summary.push('')
  }

  if (warnings.length > 0) {
    summary.push('### ⚠️ 警告', '')
    for (const warning of warnings)
      summary.push(`- \`${warning.file.fileName}\` ${warning.message}`)
    summary.push('', '非基准语言的缺失翻译默认只告警；如需作为错误，使用 `--strict-parity`。', '')
  }

  if (errors.length === 0 && warnings.length === 0)
    summary.push(`✅ ${results.length} 个翻译文件，${totalKeys} 个翻译键，无空翻译或语法问题。`)
  else if (errors.length === 0)
    summary.push(`✅ 无空翻译或语法错误；${results.length} 个翻译文件，${totalKeys} 个翻译键。`)
  else
    summary.push('空字符串不会触发英文回退，请补全翻译；非英文缺失翻译可通过 `--strict-parity` 强制失败。')

  if (errors.length > 0 || warnings.length > 0) {
    summary.push(
      '',
      `本地检查：\`node .github/scripts/locale-check.mjs ${options.strictParity ? '--strict-parity ' : ''}[翻译目录]\``,
    )
  }

  writeSummary(summary, errors.length === 0)
  if (errors.length > 0)
    process.exitCode = 1
}

main()
