import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

export default function middleware(
    request: NextRequest,
    event: NextFetchEvent,
) {
    let response = NextResponse.next();
    response.headers.append('x-middleware', 'yep')
    return response;
}

