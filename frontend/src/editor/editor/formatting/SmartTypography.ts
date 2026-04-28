import { Extension, InputRule } from '@tiptap/core'

function rule(find: RegExp, replace: (match: RegExpMatchArray) => string): InputRule {
  return new InputRule({
    find,
    handler: ({ state, range, match }) => {
      const text = replace(match)
      state.tr.insertText(text, range.from, range.to)
    },
  })
}

export const SmartTypography = Extension.create({
  name: 'smartTypography',

  addInputRules() {
    return [
      // Ellipsis
      rule(/\.\.\.$/, () => '…'),
      // Em-dash from --
      rule(/--$/, () => '—'),
      // En-dash from -- followed by digits would have replaced. Keep simple: only em.
      // Arrows
      rule(/->$/, () => '→'),
      rule(/<-$/, () => '←'),
      rule(/<=>$/, () => '⇔'),
      rule(/=>$/, () => '⇒'),
      rule(/<==$/, () => '⇐'),
      // (c), (r), (tm)
      rule(/\(c\)$/i, () => '©'),
      rule(/\(r\)$/i, () => '®'),
      rule(/\(tm\)$/i, () => '™'),
      // Curly double-quote OPEN — at start of line/paragraph or after whitespace/opener
      rule(/(^|[\s({\[—–])"$/, (m) => `${m[1] ?? ''}“`),
      // Curly double-quote CLOSE — after a non-space char
      rule(/(\S)"$/, (m) => `${m[1]}”`),
      // Curly single-quote OPEN
      rule(/(^|[\s({\[—–])'$/, (m) => `${m[1] ?? ''}‘`),
      // Curly single-quote CLOSE / apostrophe
      rule(/(\S)'$/, (m) => `${m[1]}’`),
      // Fractions
      rule(/(?:^|\s)1\/2$/, () => ' ½'),
      rule(/(?:^|\s)1\/4$/, () => ' ¼'),
      rule(/(?:^|\s)3\/4$/, () => ' ¾'),
    ]
  },
})
