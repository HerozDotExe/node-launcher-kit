import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    tags: [
      {
        name: 'full',
        description: 'Full test suite',
        concurrent: false
      },
      {
        name: 'vanilla',
        description: 'Only vanilla tests from full test suite',
        concurrent: false
      },
      {
        name: 'forge',
        description: 'Only forge and neoforge tests from full test suite',
        concurrent: false
      }
    ],
  },
})