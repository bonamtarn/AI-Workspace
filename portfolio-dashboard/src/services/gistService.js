const FILENAME = 'portfolio_dashboard.json'

export async function testAndGetUser(token) {
  const r = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${token}` }
  })
  if (!r.ok) throw new Error(`Token ไม่ถูกต้อง (${r.status})`)
  return r.json()
}

export async function findGist(token) {
  const r = await fetch('https://api.github.com/gists?per_page=100', {
    headers: { Authorization: `token ${token}` }
  })
  if (!r.ok) throw new Error(`GitHub API error ${r.status}`)
  const gists = await r.json()
  return gists.find(g => g.files[FILENAME])?.id ?? null
}

export async function saveToGist(token, gistId, state) {
  const syncedAt = Date.now()
  const content = JSON.stringify({ ...state, _syncedAt: syncedAt })
  const body = { description: 'Portfolio Dashboard Sync', files: { [FILENAME]: { content } } }
  const r = await fetch(
    gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists',
    {
      method: gistId ? 'PATCH' : 'POST',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(gistId ? body : { ...body, public: false })
    }
  )
  if (!r.ok) throw new Error(`Gist save failed (${r.status})`)
  const data = await r.json()
  return { id: data.id, syncedAt }
}

export async function loadFromGist(token, gistId) {
  const r = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `token ${token}` }
  })
  if (!r.ok) throw new Error(`Gist load failed (${r.status})`)
  const gist = await r.json()
  const content = gist.files[FILENAME]?.content
  if (!content) throw new Error('ไม่พบข้อมูลพอร์ตใน Gist')
  return JSON.parse(content)
}
