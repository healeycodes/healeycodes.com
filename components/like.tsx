import { useEffect, useState } from "react"
import Cookies from 'js-cookie';

const INITIAL_TEXT = "Like?"
const THANKS_TEXT = "Thanks!"
const LIKED_TEXT = "Liked ♥︎"

const THANKS_VISIBLE_FOR_MS = 600

export default function Like({ id }: { id: string }) {
    const alreadyClicked = Cookies.get(id) !== undefined

    // --                                                    --.
    // Allow a developer (aka me) to clear their local cookies |
    // of all currently rendered like buttons
    if (globalThis.debugClearCookiesList === undefined) {
        globalThis.debugClearCookiesList = []
        globalThis.debugClearCookies = () => {
            globalThis.debugClearCookiesList.forEach(f => f())
        }
    }
    globalThis.debugClearCookiesList.push(() => {
        Cookies.remove(id);
        console.log('removed', id)
    })
    // --                                                    __.

    const [clicked, setClicked] = useState(false)
    const [liked, setLiked] = useState(alreadyClicked)
    const [display, setDisplay] = useState(alreadyClicked ? LIKED_TEXT : INITIAL_TEXT)

    useEffect(() => {
        if (!clicked) {
            return
        }

        fetch('/api/like-button', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })

        const likedTimer = setTimeout(() => {
            setDisplay(LIKED_TEXT)
        }, THANKS_VISIBLE_FOR_MS)

        return () => {
            clearTimeout(likedTimer)
        }
    }, [clicked])

    const click = () => {
        if (clicked || liked) {
            return
        }

        Cookies.set(id, '1')
        setDisplay(THANKS_TEXT)
        setClicked(true)
        setLiked(true)
    }

    return <>
        <span id={id} onClick={click} className={`like-btn${!clicked ? ' like-btn-can-click' : ''}`}>{display}</span>
        <style jsx>{`
        .like-btn {
            color: var(--light-text);
        }
        .like-btn-can-click:hover {
            cursor: pointer;
            color: var(--text);
        }
    `}</style>
    </>
}
