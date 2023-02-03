import type { NextRequest } from "next/server"
import { createClient } from '@supabase/supabase-js'

export const config = {
    runtime: 'edge',
    regions: ['iad1'],
}

type LikePayload = {
    id: string
}

// Turn a request into a way to identify-ish users
// (don't keep personal identifiable information!)
// e.g. 127.0.0.1 -> `?? | ?? | ?? | MTIC4x`
const requestToUser = (req: NextRequest) => {
    const geoStr = `${req.geo.country || '??'} | ${req.geo.region || '??'} | ${req.geo.city || '??'} | `
    const safeIp = req.ip || '127.0.0.1'
    const base64ip = btoa(safeIp).toString()
    const fiveChars = base64ip.slice(0, 3) + base64ip.slice(base64ip.length - 3, base64ip.length)
    return geoStr + fiveChars
}

export default async (req: NextRequest) => {
    const supabaseUrl = process.env.LIKE_DB_URL
    const supabaseKey = process.env.LIKE_DB_KEY
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload: LikePayload = await req.json()

    const { error } = await supabase
        .from('likes')
        .insert([
            { like_id: payload.id, by: requestToUser(req) },
        ])
    if (error) {
        console.log(error, payload, req.ip)
    }

    return new Response('')
}
