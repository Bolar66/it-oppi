import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearAllData } from '../progress/repo.ts'

afterEach(async () => {
  cleanup()
  await clearAllData()
  // Node-ympäristön testeissä (content.test) localStoragea ei ole.
  globalThis.localStorage?.clear()
})
