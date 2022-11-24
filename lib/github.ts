// Inspired by: https://gist.github.com/yyx990803/7745157
async function starCounter(username: string) {
    const res = await (await fetch(`https://api.github.com/users/${username}`)).json()
    if (!res.public_repos) {
        throw new Error('no public repositories')
    }

    let totalStars = 0
    const pages = Math.ceil(res.public_repos / 100)
    let i = pages;

    while (i--) {
        const repositories = await (await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${i + 1}`)).json()
        repositories.forEach(repo => {
            totalStars += repo.stargazers_count
        })
    }

    return totalStars
}

export { starCounter }
