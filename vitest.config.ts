import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    tags: [
      {
        name: 'vanilla',
        description: 'Only vanilla tests',
        concurrent: false
      },
      {
        name: 'forge',
        description: 'Only forge tests',
        concurrent: false
      },
      {
        name: 'neoforge',
        description: 'Only neoforge tests',
        concurrent: false
      },
      {
        name: 'fabric',
        description: 'Only fabric tests',
        concurrent: false
      },
      {
        name: 'modrinth',
        description: 'Only tests with populars modrinth modpacks',
        concurrent: false
      }
    ],
  },
})