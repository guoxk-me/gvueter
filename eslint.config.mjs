import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: {
      pnpm:true,
      css: true,
      html: true,
      markdown: true,
    },
  },
)
