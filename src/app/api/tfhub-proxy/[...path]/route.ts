import { NextRequest } from 'next/server'

const BASE =
  'https://storage.googleapis.com/tfhub-tfjs-modules/google/imagenet/mobilenet_v2_140_224/feature_vector/5/default/1/'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params
  const key = path?.length ? path.join('/') : 'model.json'
  const upstream = await fetch(BASE + key)

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status })
  }

  const headers = new Headers(upstream.headers)
  headers.set('cache-control', 'public, max-age=86400')
  headers.set('access-control-allow-origin', '*')
  headers.delete('content-encoding')

  return new Response(upstream.body, { status: upstream.status, headers })
}
