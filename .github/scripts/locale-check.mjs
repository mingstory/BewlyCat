import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// 校验 src/_locales 下所有翻译文件：
// 1. 不允许空翻译（'' / "" / 空值 / 空块标量）。vue-i18n 对存在的空字符串键不触发
//    fallbackLocale 回退，会直接渲染成空白界面。
// 2. 各语言文件键路径必须一致，防止增删键时产生语言间漂移。
// 仅支持项目实际使用的 YAML 子集（嵌套映射、块标量、引号值、注释、单行流式集合），
// 遇到无法识别的语法直接报错，不做静默猜测。
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const localeDir = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(repoRoot, 'src', '_locales')

// 冒号后必须跟单个空格或行尾，避免把 `key:value`（YAML 中的普通标量）误判为键；
// 多余空格归入值部分，由后续 trim 处理
const KEY_LINE_PATTERN = /^(?<indent>\s*)(?<name>[\w-]+):(?:$| (?<value>.*)$)/
const BLOCK_SCALAR_HEADER_PATTERN = /^[|>][+-]?\s*(?:#.*)?$/
// 完整的引号值 token（含转义），用于判断引号内是否为空
const QUOTED_VALUE_PATTERN = /^(?<quote>['"])(?<inner>(?:\\.|(?!\k<quote>).)*)\k<quote>/

function escapeAnnotation(value) {
  return value
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
}

function error(message, file, line) {
  const fileAttribute = file ? `file=${escapeAnnotation(file)},` : ''
  const lineAttribute = line ? `line=${line},` : ''
  console.error(`::error ${fileAttribute}${lineAttribute}title=翻译文件检查::${escapeAnnotation(message)}`)
}

// 未加引号的值中，空格加 # 开始注释
function stripComment(raw) {
  const index = raw.indexOf(' #')
  return index === -1 ? raw : raw.slice(0, index)
}

function parseLocaleFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  const keys = new Map()
  const emptyValues = []
  const syntaxErrors = []
  const stack = []
  // 裸 `key:` 在 YAML 中既可能是空值也可能是映射父键，先记为候选，
  // 一旦有更深的子键挂上来就排除，文件结束时仍留在候选里的才是空值
  const emptyCandidates = new Map()
  let pendingBlockScalar = null

  const finishPendingBlockScalar = () => {
    if (pendingBlockScalar && !pendingBlockScalar.hasContent)
      emptyValues.push({ line: pendingBlockScalar.line, path: pendingBlockScalar.path })
    pendingBlockScalar = null
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const lineNumber = index + 1

    if (pendingBlockScalar) {
      const indent = line.search(/\S/)
      // 块标量内容行必须比键更深缩进；空行不结束块，由下一个非空行判定
      if (line.trim() === '' || indent > pendingBlockScalar.indent) {
        if (line.trim() !== '')
          pendingBlockScalar.hasContent = true
        continue
      }
      finishPendingBlockScalar()
    }

    if (line.trim() === '' || line.trim().startsWith('#'))
      continue

    const match = KEY_LINE_PATTERN.exec(line)
    if (!match) {
      syntaxErrors.push({ line: lineNumber, message: `无法识别的行，请人工确认：\`${line.trim()}\`` })
      continue
    }

    const { indent: indentSpace, name, value: rawValue = '' } = match.groups
    const indent = indentSpace.length
    while (stack.length && stack.at(-1).indent >= indent)
      stack.pop()

    // 弹栈后栈顶即当前键的父键；父键一旦有子键就不再是空值
    const parent = stack.at(-1)
    if (parent)
      emptyCandidates.delete(parent.path)

    const path = [...stack.map(entry => entry.name), name].join('.')
    if (keys.has(path)) {
      syntaxErrors.push({ line: lineNumber, message: `重复键 \`${path}\`（首次出现在第 ${keys.get(path)} 行）` })
      continue
    }
    keys.set(path, lineNumber)
    stack.push({ indent, name, path })

    const value = rawValue.trim()
    if (value.startsWith('|') || value.startsWith('>')) {
      if (!BLOCK_SCALAR_HEADER_PATTERN.test(value)) {
        syntaxErrors.push({ line: lineNumber, message: `无法识别的块标量头部：\`${value}\`` })
        continue
      }
      pendingBlockScalar = { indent, line: lineNumber, path, hasContent: false }
    }
    else if (value.startsWith('\'') || value.startsWith('"')) {
      const quoted = QUOTED_VALUE_PATTERN.exec(value)
      if (!quoted) {
        syntaxErrors.push({ line: lineNumber, message: `无法识别的引号值：\`${value}\`` })
        continue
      }
      if (quoted.groups.inner === '')
        emptyValues.push({ line: lineNumber, path })
    }
    else if (stripComment(value).trim() === '') {
      emptyCandidates.set(path, lineNumber)
    }
  }

  finishPendingBlockScalar()
  for (const [path, line] of emptyCandidates)
    emptyValues.push({ line, path })
  return { keys, emptyValues, syntaxErrors }
}

function main() {
  let fileNames
  try {
    fileNames = readdirSync(localeDir).filter(name => name.endsWith('.yml')).sort()
  }
  catch {
    console.error(`无法读取翻译目录：${localeDir}`)
    process.exitCode = 2
    return
  }

  if (fileNames.length === 0) {
    console.error(`翻译目录中没有 .yml 文件：${localeDir}`)
    process.exitCode = 2
    return
  }

  const results = fileNames.map((fileName) => {
    const filePath = join(localeDir, fileName)
    return { fileName, filePath, ...parseLocaleFile(filePath) }
  })

  // 键一致性：以所有文件键的并集为基准，报告每个文件缺失的键
  const keyOwners = new Map()
  for (const result of results) {
    for (const [path, line] of result.keys)
      keyOwners.set(path, { file: result.fileName, line })
  }
  for (const result of results) {
    result.missingKeys = [...keyOwners.keys()]
      .filter(path => !result.keys.has(path))
      .map(path => ({ path, reference: keyOwners.get(path) }))
  }

  const summary = ['## 翻译文件检查', '']
  let failed = false

  const emptyOrSyntaxFiles = results.filter(result =>
    result.emptyValues.length > 0 || result.syntaxErrors.length > 0,
  )
  if (emptyOrSyntaxFiles.length > 0) {
    failed = true
    summary.push('### ❌ 空翻译或语法问题', '')
    for (const result of emptyOrSyntaxFiles) {
      for (const { line, path } of result.emptyValues) {
        error(`翻译为空：\`${path}\`（空字符串不会触发 fallback，会渲染成空白）`, result.fileName, line)
        summary.push(`- \`${result.fileName}:${line}\` 翻译为空：\`${path}\``)
      }
      for (const { line, message } of result.syntaxErrors) {
        error(message, result.fileName, line)
        summary.push(`- \`${result.fileName}:${line}\` ${message}`)
      }
    }
    summary.push('')
  }

  const parityFailedFiles = results.filter(result => result.missingKeys.length > 0)
  if (parityFailedFiles.length > 0) {
    failed = true
    summary.push('### ❌ 各语言文件键不一致', '')
    for (const result of parityFailedFiles) {
      const detail = result.missingKeys
        .map(({ path, reference }) => `\`${path}\`（参考 \`${reference.file}:${reference.line}\`）`)
        .join('、')
      error(`缺少 ${result.missingKeys.length} 个键：${detail}`, result.fileName)
      summary.push(`- \`${result.fileName}\` 缺少 ${result.missingKeys.length} 个键：${detail}`)
    }
    summary.push('')
  }

  if (failed) {
    summary.push('请补全翻译并保持四个语言文件键结构一致。')
    console.error(summary.join('\n'))
    process.exitCode = 1
    return
  }

  console.log(`✅ ${fileNames.length} 个翻译文件共 ${keyOwners.size} 个键，无空翻译，键一致。`)
}

main()
