import { createClient } from '@supabase/supabase-js'

// In-memory & localStorage fallback for development/testing when Supabase is not configured
class MockSupabaseClient {
  constructor() {
    this.authListeners = new Set()
    this.storagePrefix = 'culture_vault_mock_'
  }

  getStorage(key) {
    if (typeof window === 'undefined') return null
    try {
      const val = localStorage.getItem(this.storagePrefix + key)
      return val ? JSON.parse(val) : null
    } catch {
      return null
    }
  }

  setStorage(key, val) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(val))
    } catch {}
  }

  get auth() {
    return {
      getSession: async () => {
        const session = this.getStorage('session')
        return { data: { session }, error: null }
      },
      onAuthStateChange: (callback) => {
        this.authListeners.add(callback)
        const session = this.getStorage('session')
        setTimeout(() => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session), 0)
        return {
          data: {
            subscription: {
              unsubscribe: () => this.authListeners.delete(callback)
            }
          }
        }
      },
      signUp: async ({ email, password, options = {} }) => {
        const user = {
          id: 'user_' + Math.random().toString(36).slice(2, 10),
          email,
          user_metadata: options.data || {
            first_name: options.data?.first_name || email.split('@')[0],
            last_name: options.data?.last_name || ''
          }
        }
        const session = { user, access_token: 'mock-session-token' }
        this.setStorage('session', session)
        this.authListeners.forEach(cb => cb('SIGNED_IN', session))
        return { data: { user, session }, error: null }
      },
      signInWithPassword: async ({ email }) => {
        let session = this.getStorage('session')
        if (!session || session.user?.email !== email) {
          const user = {
            id: 'user_' + Math.random().toString(36).slice(2, 10),
            email,
            user_metadata: { first_name: email.split('@')[0], last_name: '' }
          }
          session = { user, access_token: 'mock-session-token' }
        }
        this.setStorage('session', session)
        this.authListeners.forEach(cb => cb('SIGNED_IN', session))
        return { data: { user: session.user, session }, error: null }
      },
      signOut: async () => {
        this.setStorage('session', null)
        this.authListeners.forEach(cb => cb('SIGNED_OUT', null))
        return { error: null }
      },
      updateUser: async ({ data }) => {
        const session = this.getStorage('session')
        if (session && session.user) {
          session.user.user_metadata = { ...(session.user.user_metadata || {}), ...data }
          this.setStorage('session', session)
          this.authListeners.forEach(cb => cb('USER_UPDATED', session))
          return { data: { user: session.user }, error: null }
        }
        return { data: { user: null }, error: null }
      },
      resetPasswordForEmail: async () => {
        return { data: {}, error: null }
      }
    }
  }

  from(table) {
    const self = this

    const getTableItems = () => {
      let items = self.getStorage('table_' + table)
      if (!items) {
        if (table === 'vinyls') {
          // Provide default starter items for a smooth initial experience
          items = [
            {
              id: 'init-1',
              user_id: self.getStorage('session')?.user?.id || 'demo-user',
              title: 'Abbey Road',
              artist: 'The Beatles',
              year: '1969',
              genre: 'Rock',
              type: 'vinyl',
              format: 'LP',
              cover: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=500&q=80',
              is_wishlist: false,
              rating: 5,
              notes: 'Édition originale remastérisée',
              collector_data: {},
              created_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'init-2',
              user_id: self.getStorage('session')?.user?.id || 'demo-user',
              title: 'Dune',
              artist: 'Frank Herbert',
              year: '1965',
              genre: 'Science-Fiction',
              type: 'book',
              format: 'Broché',
              cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80',
              is_wishlist: false,
              rating: 5,
              notes: 'Cycle de Dune',
              collector_data: {},
              created_at: new Date(Date.now() - 7200000).toISOString()
            },
            {
              id: 'init-3',
              user_id: self.getStorage('session')?.user?.id || 'demo-user',
              title: 'Interstellar',
              artist: 'Christopher Nolan',
              year: '2014',
              genre: 'Science-Fiction',
              type: 'movie',
              format: 'Blu-ray 4K',
              cover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
              is_wishlist: true,
              rating: 4,
              notes: 'Édition Steelbook recherchée',
              collector_data: {},
              created_at: new Date(Date.now() - 10800000).toISOString()
            }
          ]
          self.setStorage('table_' + table, items)
        } else {
          items = []
        }
      }
      return items
    }

    const saveTableItems = (items) => {
      self.setStorage('table_' + table, items)
    }

    // Query builder chaining
    return {
      select: function(cols = '*') {
        let filtered = [...getTableItems()]
        const builder = {
          eq: function(col, val) {
            filtered = filtered.filter(item => item[col] === val)
            return builder
          },
          order: function(col, { ascending = true } = {}) {
            filtered.sort((a, b) => {
              const valA = a[col] || ''
              const valB = b[col] || ''
              return (valA > valB ? 1 : valA < valB ? -1 : 0) * (ascending ? 1 : -1)
            })
            return builder
          },
          maybeSingle: async function() {
            return { data: filtered[0] || null, error: null }
          },
          then: function(resolve, reject) {
            return Promise.resolve({ data: filtered, error: null }).then(resolve, reject)
          }
        }
        return builder
      },
      insert: function(rows) {
        const items = getTableItems()
        const insertedRows = (Array.isArray(rows) ? rows : [rows]).map(r => ({
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          created_at: new Date().toISOString(),
          ...r
        }))
        items.unshift(...insertedRows)
        saveTableItems(items)

        const builder = {
          select: async function() {
            return { data: insertedRows, error: null }
          },
          then: function(resolve, reject) {
            return Promise.resolve({ data: insertedRows, error: null }).then(resolve, reject)
          }
        }
        return builder
      },
      update: function(fields) {
        let updatedItems = []
        const builder = {
          eq: function(col, val) {
            const items = getTableItems()
            items.forEach((item, idx) => {
              if (item[col] === val) {
                items[idx] = { ...item, ...fields, updated_at: new Date().toISOString() }
                updatedItems.push(items[idx])
              }
            })
            saveTableItems(items)
            return builder
          },
          select: async function() {
            return { data: updatedItems, error: null }
          },
          then: function(resolve, reject) {
            return Promise.resolve({ data: updatedItems, error: null }).then(resolve, reject)
          }
        }
        return builder
      },
      delete: function() {
        const builder = {
          eq: function(col, val) {
            let items = getTableItems()
            items = items.filter(item => item[col] !== val)
            saveTableItems(items)
            return Promise.resolve({ error: null })
          },
          then: function(resolve, reject) {
            return Promise.resolve({ error: null }).then(resolve, reject)
          }
        }
        return builder
      },
      upsert: async function(data) {
        const items = getTableItems()
        const dataArray = Array.isArray(data) ? data : [data]
        dataArray.forEach(d => {
          const idx = items.findIndex(i => (d.id && i.id === d.id))
          if (idx !== -1) {
            items[idx] = { ...items[idx], ...d }
          } else {
            items.push(d)
          }
        })
        saveTableItems(items)
        return { data: dataArray, error: null }
      }
    }
  }
}

export function createSupabaseClient(url, key) {
  if (url && typeof url === 'string' && url.startsWith('http') && key) {
    try {
      return createClient(url, key)
    } catch (e) {
      console.warn('[Supabase] Failed to initialize official client, falling back to in-memory store:', e.message)
    }
  }
  return new MockSupabaseClient()
}
