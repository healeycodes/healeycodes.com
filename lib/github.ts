import ms from 'ms'

// Inspired by: https://gist.github.com/yyx990803/7745157
async function statCounter(username: string) {
    const res = await (await fetch(`https://api.github.com/users/${username}`)).json()
    if (!res.public_repos) {
        throw new Error(`no public repositories, or an error..\n\n${JSON.stringify(res)}`)
    }

    let totalStars = 0
    let mostRecentPush = new Date(1970)
    const pages = Math.ceil(res.public_repos / 100)
    let i = pages;

    while (i--) {
        const repositories = await (await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${i + 1}`)).json()
        repositories.forEach(repo => {
            totalStars += repo.stargazers_count
            const pushedAt = new Date(repo.pushed_at)
            if (pushedAt > mostRecentPush) {
                mostRecentPush = pushedAt
            }
        })
    }

    const mostRecentPushFormatted = ms(Math.abs(Date.now() - mostRecentPush.getTime()), { long: true })
    return { totalStars, mostRecentPushFormatted }
}

export { statCounter }
