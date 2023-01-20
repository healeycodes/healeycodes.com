import { test, expect } from "@playwright/test";

test("rss feed is returned", async ({ page, request }) => {
    // The RSS feed is generated on build (or during dev when `/` is visited)
    // so we fake a `/` visit here
    await page.goto("/");

    const text = await (await request.get('/feed.xml')).text()

    // Check an item exists with a snapshot of expected data
    expect(text).toContain(`<title>Andrew Healey's Blog</title>`)
    expect(text).toContain(`<title><![CDATA[Profiling and Optimizing an Interpreter]]></title>`)
    expect(text).toContain(`<guid>https://healeycodes.com/profiling-and-optimizing-an-interpreter</guid>`)
    expect(text).toContain(`<pubDate>Thu, 19 Jan 2023 00:00:00 GMT</pubDate>`)
    expect(text).toContain(`<description><![CDATA[Rewriting library code to speed up my interpreter benchmark by 28%.]]></description>`)
    expect(text).toContain(`<author>healeycodes@gmail.com (Andrew Healey)</author>`)
});
